#!/usr/bin/env python
"""
Script para gerar brackets retroativamente para campeonatos KNOCKOUT existentes.
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from fnc_championships.models import Championship, Bracket
from run_enhanced_tests import generate_bracket_for_knockout, print_header, print_success, print_info

def main():
    print_header("GERANDO BRACKETS PARA CAMPEONATOS KNOCKOUT")
    
    # Buscar todos os campeonatos KNOCKOUT
    knockout_championships = Championship.objects.filter(
        championship_type='KNOCKOUT'
    ).order_by('-created_at')
    
    if not knockout_championships.exists():
        print_info("Nenhum campeonato KNOCKOUT encontrado.")
        return
    
    print_info(f"Encontrados {knockout_championships.count()} campeonatos KNOCKOUT\n")
    
    success_count = 0
    skip_count = 0
    error_count = 0
    
    for championship in knockout_championships:
        print_info(f"📊 {championship.name} (ID: {championship.id})")
        print_info(f"   Status: {championship.get_status_display()}")
        
        # Verificar se já tem bracket
        existing_bracket = Bracket.objects.filter(championship=championship).first()
        if existing_bracket:
            print_info(f"   ⏭️  Bracket já existe (pular)")
            skip_count += 1
            print()
            continue
        
        try:
            bracket = generate_bracket_for_knockout(championship)
            if bracket:
                success_count += 1
            else:
                error_count += 1
        except Exception as e:
            print(f"   ❌ Erro: {e}")
            error_count += 1
        
        print()
    
    # Resumo
    print_header("RESUMO")
    print_success(f"✅ Brackets criados: {success_count}")
    print_info(f"⏭️  Brackets existentes (pulados): {skip_count}")
    if error_count > 0:
        print(f"❌ Erros: {error_count}")

if __name__ == '__main__':
    main()
