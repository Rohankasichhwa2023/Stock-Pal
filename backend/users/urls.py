from django.urls import path
from . import views

urlpatterns = [
    path('signup/', views.signup, name='signup'),
    path('login/', views.login, name='login'),
    path('admin-login/', views.admin_login_jwt, name='admin_login_jwt'),
]
