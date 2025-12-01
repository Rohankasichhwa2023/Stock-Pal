from django.urls import path
from . import views
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    # Admin company routes
    path("api/admin/companies/", views.list_companies_admin, name="list_companies_admin"),
    path("api/admin/companies/create/", views.create_company, name="create_company"),
    path("api/admin/companies/update/<int:company_id>/", views.update_company, name="update_company"),
    path("api/admin/companies/delete/<int:company_id>/", views.delete_company, name="delete_company"),

    # Company routes
    path("api/companies/", views.list_companies, name="list_companies"),
    path("api/info/<str:symbol>/", views.company_info, name="company_info"),
    path("api/history/<str:symbol>/", views.price_history, name="price_history"),
    path("api/announcement/<str:symbol>/", views.announcement, name="announcement"),
    path("api/prediction/<str:symbol>/", views.stock_prediction , name="prediction_info"),

    # Nepse & top gainers/losers
    path('api/nepse/', views.nepse_data, name='nepse_data'),
    path('api/company/top/', views.top_gainers_losers, name='top_gainers_losers'),

    # File upload
    path("api/upload-stock-files/", views.upload_stock_files, name="upload-stock-files"),

    # Generic stock route (must be last)
    path("api/<str:symbol>/", views.stock_data, name="stock_data"),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
urlpatterns += static('/outputs/', document_root=settings.BASE_DIR / 'stockdata' / 'outputs')


