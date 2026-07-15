<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Route;
use App\Interfaces\RoutingProviderInterface;
use App\Services\Routing\PythonAStarProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(RoutingProviderInterface::class, PythonAStarProvider::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Ensure app routes are loaded even if RouteServiceProvider is not present
        if (file_exists(base_path('routes/api.php'))) {
            Route::prefix('api')->middleware('api')->group(base_path('routes/api.php'));
        }

        if (file_exists(base_path('routes/web.php'))) {
            Route::middleware('web')->group(base_path('routes/web.php'));
        }
    }
}
