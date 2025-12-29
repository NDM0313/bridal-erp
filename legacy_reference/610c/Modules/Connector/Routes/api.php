<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;

// PUBLIC ROUTES - No authentication required
Route::prefix('connector/api')->group(function () {
    // Login endpoint
    Route::post('login', function (Request $request) {
        try {
            $request->validate([
                'username' => 'required',
                'password' => 'required',
                'client_id' => 'required',
                'client_secret' => 'required',
            ]);

            $tokenRequest = Request::create('/oauth/token', 'POST', [
                'grant_type' => 'password',
                'client_id' => $request->client_id,
                'client_secret' => $request->client_secret,
                'username' => $request->username,
                'password' => $request->password,
                'scope' => '*',
            ]);

            $response = app()->handle($tokenRequest);
            $data = json_decode($response->getContent(), true);

            if ($response->getStatusCode() === 200) {
                return response()->json($data, 200);
            }

            return response()->json([
                'error' => 'invalid_credentials',
                'message' => 'Invalid username or password'
            ], 401);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'validation_error',
                'message' => 'Missing required fields',
                'details' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'server_error',
                'message' => $e->getMessage()
            ], 500);
        }
    });
});

// AUTHENTICATED ROUTES - Require api middleware
Route::middleware('auth:api', 'timezone')->prefix('connector/api')->group(function () {
    // User endpoints
    Route::get('user/loggedin', [Modules\Connector\Http\Controllers\Api\UserController::class, 'loggedin']);
    Route::post('user-registration', [Modules\Connector\Http\Controllers\Api\UserController::class, 'registerUser']);
    Route::post('update-password', [Modules\Connector\Http\Controllers\Api\UserController::class, 'updatePassword']);
    Route::post('forget-password', [Modules\Connector\Http\Controllers\Api\UserController::class, 'forgetPassword']);
    Route::resource('user', Modules\Connector\Http\Controllers\Api\UserController::class)->only('index', 'show');

    // Business locations and details
    Route::get('business-locations', [Modules\Connector\Http\Controllers\Api\CommonResourceController::class, 'getBusinessLocations']);
    Route::get('business-details', [Modules\Connector\Http\Controllers\Api\CommonResourceController::class, 'getBusinessDetails']);
    Route::resource('business-location', Modules\Connector\Http\Controllers\Api\BusinessLocationController::class)->only('index', 'show');

    // Dashboard and reports
    Route::get('dashboard-summary', [Modules\Connector\Http\Controllers\Api\CommonResourceController::class, 'getDashboardSummary']);
    Route::get('profit-loss-report', [Modules\Connector\Http\Controllers\Api\CommonResourceController::class, 'getProfitLoss']);
    Route::get('product-stock-report', [Modules\Connector\Http\Controllers\Api\CommonResourceController::class, 'getProductStock']);

    // Products
    Route::resource('product', Modules\Connector\Http\Controllers\Api\ProductController::class)->only('index', 'show');
    Route::get('selling-price-group', [Modules\Connector\Http\Controllers\Api\ProductController::class, 'getSellingPriceGroup']);
    Route::get('variation/{id?}', [Modules\Connector\Http\Controllers\Api\ProductController::class, 'listVariations']);

    // Customers/Contacts
    Route::resource('contactapi', Modules\Connector\Http\Controllers\Api\ContactController::class)->only('index', 'show', 'store', 'update');
    Route::post('contactapi-payment', [Modules\Connector\Http\Controllers\Api\ContactController::class, 'contactPay']);

    // Sales/Transactions
    Route::resource('sell', Modules\Connector\Http\Controllers\Api\SellController::class)->only('index', 'store', 'show', 'update', 'destroy');
    Route::post('sell-return', [Modules\Connector\Http\Controllers\Api\SellController::class, 'addSellReturn']);
    Route::get('list-sell-return', [Modules\Connector\Http\Controllers\Api\SellController::class, 'listSellReturn']);
    Route::post('update-shipping-status', [Modules\Connector\Http\Controllers\Api\SellController::class, 'updateSellShippingStatus']);

    // Expenses
    Route::resource('expense', Modules\Connector\Http\Controllers\Api\ExpenseController::class)->only('index', 'store', 'show', 'update');
    Route::get('expense-refund', [Modules\Connector\Http\Controllers\Api\ExpenseController::class, 'listExpenseRefund']);
    Route::get('expense-categories', [Modules\Connector\Http\Controllers\Api\ExpenseController::class, 'listExpenseCategories']);

    // Payments
    Route::get('payment-accounts', [Modules\Connector\Http\Controllers\Api\CommonResourceController::class, 'getPaymentAccounts']);
    Route::get('payment-methods', [Modules\Connector\Http\Controllers\Api\CommonResourceController::class, 'getPaymentMethods']);

    // Cash register
    Route::resource('cash-register', Modules\Connector\Http\Controllers\Api\CashRegisterController::class)->only('index', 'store', 'show', 'update');

    // Categories, Units, Brands, Tax
    Route::resource('taxonomy', 'Modules\Connector\Http\Controllers\Api\CategoryController')->only('index', 'show');
    Route::resource('unit', Modules\Connector\Http\Controllers\Api\UnitController::class)->only('index', 'show');
    Route::resource('brand', Modules\Connector\Http\Controllers\Api\BrandController::class)->only('index', 'show');
    Route::resource('tax', 'Modules\Connector\Http\Controllers\Api\TaxController')->only('index', 'show');

    // Tables and Services
    Route::resource('table', Modules\Connector\Http\Controllers\Api\TableController::class)->only('index', 'show');
    Route::resource('types-of-service', Modules\Connector\Http\Controllers\Api\TypesOfServiceController::class)->only('index', 'show');

    // Notifications
    Route::get('notifications', [Modules\Connector\Http\Controllers\Api\CommonResourceController::class, 'getNotifications']);
    Route::get('get-location', [Modules\Connector\Http\Controllers\Api\CommonResourceController::class, 'getLocation']);

    // Subscriptions and packages
    Route::get('active-subscription', [Modules\Connector\Http\Controllers\Api\SuperadminController::class, 'getActiveSubscription']);
    Route::get('packages', [Modules\Connector\Http\Controllers\Api\SuperadminController::class, 'getPackages']);

    // Attendance
    Route::get('get-attendance/{user_id}', [Modules\Connector\Http\Controllers\Api\AttendanceController::class, 'getAttendance']);
    Route::post('clock-in', [Modules\Connector\Http\Controllers\Api\AttendanceController::class, 'clockin']);
    Route::post('clock-out', [Modules\Connector\Http\Controllers\Api\AttendanceController::class, 'clockout']);
    Route::get('holidays', [Modules\Connector\Http\Controllers\Api\AttendanceController::class, 'getHolidays']);

    // Product sell helpers
    Route::get('new_product', [Modules\Connector\Http\Controllers\Api\ProductSellController::class, 'newProduct'])->name('new_product');
    Route::get('new_sell', [Modules\Connector\Http\Controllers\Api\ProductSellController::class, 'newSell'])->name('new_sell');
    Route::get('new_contactapi', [Modules\Connector\Http\Controllers\Api\ProductSellController::class, 'newContactApi'])->name('new_contactapi');
});

// CRM Routes
Route::middleware('auth:api', 'timezone')->prefix('connector/api/crm')->group(function () {
    Route::resource('follow-ups', 'Modules\Connector\Http\Controllers\Api\Crm\FollowUpController')->only('index', 'store', 'show', 'update');
    Route::get('follow-up-resources', [Modules\Connector\Http\Controllers\Api\Crm\FollowUpController::class, 'getFollowUpResources']);
    Route::get('leads', [Modules\Connector\Http\Controllers\Api\Crm\FollowUpController::class, 'getLeads']);
    Route::post('call-logs', [Modules\Connector\Http\Controllers\Api\Crm\CallLogsController::class, 'saveCallLogs']);
});

// Field force routes
Route::middleware('auth:api', 'timezone')->prefix('connector/api')->group(function () {
    Route::get('field-force', [Modules\Connector\Http\Controllers\Api\FieldForce\FieldForceController::class, 'index']);
    Route::post('field-force/create', [Modules\Connector\Http\Controllers\Api\FieldForce\FieldForceController::class, 'store']);
    Route::post('field-force/update-visit-status/{id}', [Modules\Connector\Http\Controllers\Api\FieldForce\FieldForceController::class, 'updateStatus']);
});
