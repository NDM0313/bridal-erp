<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\View;
use Illuminate\Support\Facades\Cache;
use App\Utils\ModuleUtil;

class ModuleAssetServiceProvider extends ServiceProvider
{

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Share module assets with all views
        View::composer('*', function ($view) {
            // Skip asset loading for AJAX requests
            if (request()->ajax()) {
                return;
            }

            $moduleAssets = $this->getModuleAssets();
            $view->with('moduleAssets', $moduleAssets);
        });
    }

    /**
     * Get module assets using the standard ModuleUtil pattern with 1-hour cache.
     */
    protected function getModuleAssets(): array
    {
        // If .env is not present yet (installer running), skip DB/cache calls
        if (! file_exists(base_path('.env'))) {
            return ['js' => [], 'css' => []];
        }

        // Skip cache in local environment for development
        if (app()->environment('local')) {
            try {
                return $this->buildModuleAssets();
            } catch (\Throwable $e) {
                return ['js' => [], 'css' => []];
            }
        }

        // Use a resilient cache call: if cache service not available or fails, fall back to building
        try {
            $ttl = now()->addSeconds(3600);

            return cache()->remember('module_assets', $ttl, function () {
                try {
                    return $this->buildModuleAssets();
                } catch (\Throwable $e) {
                    return ['js' => [], 'css' => []];
                }
            });
        } catch (\Throwable $e) {
            // If cache is not available (during install or misconfigured), just return assets directly
            try {
                return $this->buildModuleAssets();
            } catch (\Throwable $e) {
                return ['js' => [], 'css' => []];
            }
        }
    }

    /**
     * Build module assets array from ModuleUtil data.
     */
    protected function buildModuleAssets(): array
    {
        $moduleUtil = new ModuleUtil();

        // Get asset data from all module DataControllers
        try {
            $moduleAssetsData = $moduleUtil->getModuleData('getAssets');
        } catch (\Throwable $e) {
            // If module data retrieval fails (DB inaccessible), return empty assets
            return ['js' => [], 'css' => []];
        }

        // Combine all module assets
        $assets = ['js' => [], 'css' => []];

        foreach ($moduleAssetsData as $moduleName => $moduleAssets) {
            if (is_array($moduleAssets)) {
                // Add JS assets
                if (!empty($moduleAssets['js']) && is_array($moduleAssets['js'])) {
                    foreach ($moduleAssets['js'] as $js) {
                        $assets['js'][] = [
                            'path' => $js,
                            'module' => $moduleName,
                        ];
                    }
                }

                // Add CSS assets
                if (!empty($moduleAssets['css']) && is_array($moduleAssets['css'])) {
                    foreach ($moduleAssets['css'] as $css) {
                        $assets['css'][] = [
                            'path' => $css,
                            'module' => $moduleName,
                        ];
                    }
                }
            }
        }

        return $assets;
    }


}