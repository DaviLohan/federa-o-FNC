#!/bin/bash
#
# Cron Job para detecção automática de Walk-Overs
# 
# Adicione ao crontab para executar a cada 6 horas:
# 0 */6 * * * /path/to/FNC/backend/cron/detect_wo.sh >> /var/log/fnc_wo_cron.log 2>&1
#
# Ou adicione manualmente:
# crontab -e
# 0 */6 * * * /home/davilohan/projects/FNC/backend/cron/detect_wo.sh >> /tmp/fnc_wo_cron.log 2>&1

# Diretório do projeto
PROJECT_DIR="/home/davilohan/projects/FNC/backend"
VENV_DIR="$PROJECT_DIR/venv"

# Log header
echo "==================================="
echo "FNC Walk-Over Detection - $(date)"
echo "==================================="

# Ativar virtualenv
source "$VENV_DIR/bin/activate"

# Navegar para diretório do projeto
cd "$PROJECT_DIR"

# Executar comando de detecção
# Configuração: 24 horas de atraso, sem auto-declare (apenas notifica)
python manage.py detect_walkovers \
    --hours=24 \
    --notify-admin

# Status de saída
if [ $? -eq 0 ]; then
    echo "✓ Detecção concluída com sucesso"
else
    echo "✗ Erro na detecção de WO"
fi

echo ""
