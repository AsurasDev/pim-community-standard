# n8n en Railway: el volumen persistente se monta como root, pero la imagen
# oficial corre como el usuario `node`. Sin ajustar el propietario, n8n no puede
# escribir su configuración y el contenedor muere al arrancar.
#
# No se instala nada: la imagen base ha ido cambiando de Alpine a Debian, así
# que el entrypoint usa la herramienta de descenso de privilegios disponible.
FROM docker.io/n8nio/n8n:latest

USER root
COPY entrypoint.sh /usr/local/bin/railway-entrypoint.sh
RUN chmod +x /usr/local/bin/railway-entrypoint.sh

ENTRYPOINT ["/usr/local/bin/railway-entrypoint.sh"]
