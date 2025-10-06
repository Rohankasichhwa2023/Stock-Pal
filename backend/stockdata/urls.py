from django.urls import path
from . import views

urlpatterns = [
   path("api/companies/", views.list_companies, name="list_companies"),
   path("api/<str:symbol>/", views.stock_data, name="stock_data"),
   path("api/history/<str:symbol>/", views.price_history, name="price_history"),
]
