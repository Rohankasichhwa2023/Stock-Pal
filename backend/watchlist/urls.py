from django.urls import path
from . import views

urlpatterns = [
    path('', views.list_watchlist, name='watchlist_list'),         # GET
    path('add/', views.add_to_watchlist, name='watchlist_add'),   # POST
    path('remove/<str:symbol>/', views.remove_from_watchlist, name='watchlist_remove'),  # DELETE
    path('check/<str:symbol>/', views.check_watchlist, name='watchlist_check'),  # GET
]
