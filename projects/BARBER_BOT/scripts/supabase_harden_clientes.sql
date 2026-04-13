-- Barber-Bot: endurecer modelo de clientes para altas manuales sin email
-- Ejecutar en Supabase > SQL Editor

begin;

-- 1) Normalizar teléfonos existentes antes de imponer reglas
update clientes
set telefono = regexp_replace(trim(telefono), '\s+', '', 'g')
where telefono is not null;

-- 2) Teléfono obligatorio como identidad operativa del cliente
alter table clientes
  alter column telefono set not null;

-- 3) Email opcional: los clientes manuales no necesitan cuenta
alter table clientes
  alter column email drop not null;

-- 4) Un cliente de negocio debe ser único por barbería + teléfono
create unique index if not exists clientes_barberia_telefono_uidx
  on clientes (barberia_id, telefono);

-- 5) Un usuario autenticado no debe enlazarse a varios clientes
create unique index if not exists clientes_auth_user_id_uidx
  on clientes (auth_user_id)
  where auth_user_id is not null;

commit;
