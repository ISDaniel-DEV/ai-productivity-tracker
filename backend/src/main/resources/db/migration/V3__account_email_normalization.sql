-- Falla si el legado contiene correos equivalentes: resolverlos explícitamente, no fusionar cuentas.
UPDATE app_user SET email=lower(trim(email));
CREATE UNIQUE INDEX app_user_email_normalized ON app_user (lower(email));
