from django.contrib import admin

from .models import Asset, AssembledOutput, Component, Meditation, Stage

admin.site.register(Meditation)
admin.site.register(Stage)
admin.site.register(Component)
admin.site.register(Asset)
admin.site.register(AssembledOutput)
