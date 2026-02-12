from django.apps import AppConfig


class FncMatchesConfig(AppConfig):
    name = 'fnc_matches'
    default_auto_field = 'django.db.models.BigAutoField'
    
    def ready(self):
        """Importar signals quando app estiver pronto."""
        import fnc_matches.penalty_services  # Registrar signals de penalidades
