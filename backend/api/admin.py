from django.contrib import admin

from .models import ProcessedDashboard, Upload, UserProfile

admin.site.register(UserProfile)
admin.site.register(Upload)
admin.site.register(ProcessedDashboard)
