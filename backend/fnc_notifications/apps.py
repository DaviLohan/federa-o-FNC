from django.apps import AppConfig


class FncNotificationsConfig(AppConfig):
    name = 'fnc_notifications'
    
    def ready(self):
        """
        Importa signals quando o app está pronto.
        """
        import fnc_notifications.signals  # noqa
