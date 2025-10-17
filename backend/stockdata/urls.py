from django.urls import path
from . import views
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
   path("api/companies/", views.list_companies, name="list_companies"),
   path("api/info/<str:symbol>/", views.company_info, name="company_info"), 
   path('api/nepse/', views.nepse_data, name='nepse_data'),
   path('api/company/top/', views.top_gainers_losers, name='top_gainers_losers'),
   path("api/<str:symbol>/", views.stock_data, name="stock_data"),
   path("api/history/<str:symbol>/", views.price_history, name="price_history"),
   path("api/announcement/<str:symbol>/", views.announcement, name="announcement"),
]+ static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
