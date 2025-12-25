from django.db import models

class Empresa(models.Model):
    nombre = models.CharField(max_length=200)
    nit = models.CharField(max_length=30, blank=True, null=True)
    activa = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nombre
