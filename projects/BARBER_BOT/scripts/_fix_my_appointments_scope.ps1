$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
. (Join-Path $repoRoot "scripts\_n8n_common.ps1")
. (Join-Path $repoRoot "scripts\_n8n_write_common.ps1")

function Invoke-N8nApiPut {
  param(
    [Parameter(Mandatory = $true)]
    [hashtable]$Config,
    [Parameter(Mandatory = $true)]
    [string]$Path,
    [Parameter(Mandatory = $true)]
    $Body
  )

  $uri = "$($Config.BaseUrl)$Path"
  $jsonBody = $Body | ConvertTo-Json -Depth 100
  return Invoke-RestMethod -Method Put -Uri $uri -Headers $Config.Headers -ContentType "application/json" -Body $jsonBody
}

$config = Get-N8nConnectionConfig -EnvPath (Join-Path $repoRoot ".env") -ScriptPath $PSCommandPath
$workflowId = "yUTjHHCaXwxAlivQ"

$backup = Export-N8nWorkflowBackup -Config $config -WorkflowId $workflowId -OutputPath (Join-Path $repoRoot "projects\BARBER_BOT\exports\$(Get-Date -Format 'yyyyMMdd_HHmmss')_barber_my_appointments_before_scope_fix.json")
Write-Host "Backup creado en: $($backup.OutputPath)"

$workflow = $backup.Workflow
$nodes = @($workflow.nodes)

$findClientCode = @'
const inicio = $('Inicio').first().json || {};
const telefono = String(inicio.telefono || '').trim();
const barberId = String(inicio.barber_id || 'barber').trim() || 'barber';
const rows = $input.all().map(item => item.json || {});
const match = rows.find(row =>
  String(row.telefono || '').trim() === telefono &&
  String(row.barberia_id || '').trim() === barberId
);

return [{
  json: {
    cliente_id: match ? match.id : null,
    telefono,
    barber_id: barberId,
  }
}];
'@

$myAppointmentsCode = @'
const ctx = $('Buscar cliente_id').first().json || {};
const clienteId = String(ctx.cliente_id || '').trim();
const barberId = String(ctx.barber_id || 'barber').trim() || 'barber';
const citasRows = $('Leer citas').all().map(item => item.json || {});
const svcRows = $input.all().map(item => item.json || {});

if (!clienteId) {
  return [{ json: { ok: true, respuesta: 'No encontre tu perfil.', citas: [] } }];
}

const normalizeDateTime = value => String(value || '').replace(/([+-]\d{2}:\d{2}|Z)$/, '');
const ahora = new Date().toLocaleString('sv', { timeZone: 'Europe/Madrid' }).replace(' ', 'T').substring(0, 19);

const servicios = {};
svcRows.forEach(row => {
  servicios[row.id] = row.nombre;
});

const proximas = citasRows
  .filter(cita =>
    String(cita.cliente_id || '').trim() === clienteId &&
    String(cita.barberia_id || '').trim() === barberId &&
    String(cita.estado || '').trim() !== 'cancelada' &&
    normalizeDateTime(cita.fecha_hora) >= ahora
  )
  .sort((a, b) => normalizeDateTime(a.fecha_hora).localeCompare(normalizeDateTime(b.fecha_hora)));

if (!proximas.length) {
  return [{ json: { ok: true, respuesta: 'No tienes citas proximas.', citas: [] } }];
}

const citas = proximas.map(cita => {
  const servicio = servicios[cita.servicio_id] || cita.servicio_id;
  const fechaNormalizada = normalizeDateTime(cita.fecha_hora);
  const [fechaParte, horaParte = ''] = fechaNormalizada.split('T');
  const hora = horaParte.substring(0, 5);
  const fecha = new Date(fechaParte + 'T12:00:00Z').toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'Europe/Madrid',
  });

  return {
    id: cita.id,
    servicio,
    display: fecha + ' a las ' + hora,
  };
});

const respuesta = 'Tus proximas citas:\n' + citas.map(cita => '**' + cita.servicio + '** - ' + cita.display).join('\n');
return [{ json: { ok: true, respuesta, citas } }];
'@

$nodeReadClients = $nodes | Where-Object { $_.name -eq "Leer clientes" } | Select-Object -First 1
$nodeFindClient = $nodes | Where-Object { $_.name -eq "Buscar cliente_id" } | Select-Object -First 1
$nodeMyAppointments = $nodes | Where-Object { $_.name -eq "Mis citas" } | Select-Object -First 1

if (-not $nodeReadClients -or -not $nodeFindClient -or -not $nodeMyAppointments) {
  throw "No se encontraron todos los nodos esperados en barber_my_appointments"
}

$nodeReadClients.parameters.filters.conditions = @(
  @{
    keyName = "telefono"
    keyValue = "={{ `$('Inicio').first().json.telefono || '' }}"
    condition = "eq"
  },
  @{
    keyName = "barberia_id"
    keyValue = "={{ `$('Inicio').first().json.barber_id || 'barber' }}"
    condition = "eq"
  }
)
if ($nodeReadClients.parameters.PSObject.Properties.Name -contains "matchType") {
  $nodeReadClients.parameters.matchType = "allFilters"
} else {
  $nodeReadClients.parameters | Add-Member -MemberType NoteProperty -Name "matchType" -Value "allFilters"
}

$nodeFindClient.parameters.jsCode = $findClientCode
$nodeMyAppointments.parameters.jsCode = $myAppointmentsCode
if ($nodeMyAppointments.parameters.PSObject.Properties.Name -contains "mode") {
  $nodeMyAppointments.parameters.mode = "runOnceForAllItems"
} else {
  $nodeMyAppointments.parameters | Add-Member -MemberType NoteProperty -Name "mode" -Value "runOnceForAllItems"
}

$nodeReadCitas = $nodes | Where-Object { $_.name -eq "Leer citas" } | Select-Object -First 1
if (-not $nodeReadCitas) {
  throw "No se encontro el nodo Leer citas en barber_my_appointments"
}

if ($nodeReadCitas.parameters.PSObject.Properties.Name -contains "matchType") {
  $nodeReadCitas.parameters.matchType = "allFilters"
} else {
  $nodeReadCitas.parameters | Add-Member -MemberType NoteProperty -Name "matchType" -Value "allFilters"
}
$nodeReadCitas.parameters.filters.conditions = @(
  @{
    keyName = "cliente_id"
    keyValue = "={{ `$('Buscar cliente_id').first().json.cliente_id || '00000000-0000-0000-0000-000000000000' }}"
    condition = "eq"
  },
  @{
    keyName = "barberia_id"
    keyValue = "={{ `$('Buscar cliente_id').first().json.barber_id || 'barber' }}"
    condition = "eq"
  },
  @{
    keyName = "estado"
    keyValue = "cancelada"
    condition = "neq"
  }
)

$body = @{
  name = $workflow.name
  nodes = $nodes
  connections = $workflow.connections
  settings = @{
    executionOrder = $workflow.settings.executionOrder
  }
}

$updated = Invoke-N8nApiPut -Config $config -Path "/api/v1/workflows/$workflowId" -Body $body
Write-Host "Workflow actualizado: $($updated.versionId)"
