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
    })->name('connector.login');
});

// AUTHENTICATED ROUTES - Require auth:api middleware
Route::middleware('auth:api', 'timezone')->prefix('connector/api')->group(function () {
    // User endpoints
    Route::get('user/loggedin', [Modules\Connector\Http\Controllers\Api\UserController::class, 'loggedin'])->name('connector.user.loggedin');
    Route::post('user-registration', [Modules\Connector\Http\Controllers\Api\UserController::class, 'registerUser'])->name('connector.user.register');
    Route::post('update-password', [Modules\Connector\Http\Controllers\Api\UserController::class, 'updatePassword'])->name('connector.user.password');
    Route::post('forget-password', [Modules\Connector\Http\Controllers\Api\UserController::class, 'forgetPassword'])->name('connector.user.forget');
    Route::resource('user', Modules\Connector\Http\Controllers\Api\UserController::class)->only('index', 'show')->names([
        'index' => 'connector.user.index',
        'show' => 'connector.user.show',
    ]);

    // Business locations and details
    Route::get('business-locations', [Modules\Connector\Http\Controllers\Api\CommonResourceController::class, 'getBusinessLocations'])->name('connector.business-locations');
    Route::get('business-details', [Modules\Connector\Http\Controllers\Api\CommonResourceController::class, 'getBusinessDetails'])->name('connector.business-details');
    Route::resource('business-location', Modules\Connector\Http\Controllers\Api\BusinessLocationController::class)->only('index', 'show')->names([
        'index' => 'connector.business-location.index',
        'show' => 'connector.business-location.show',
    ]);

    // Dashboard and reports
    Route::get('dashboard-summary', [Modules\Connector\Http\Controllers\Api\CommonResourceController::class, 'getDashboardSummary'])->name('connector.dashboard-summary');
    Route::get('profit-loss-report', [Modules\Connector\Http\Controllers\Api\CommonResourceController::class, 'getProfitLoss'])->name('connector.profit-loss-report');
    Route::get('product-stock-report', [Modules\Connector\Http\Controllers\Api\CommonResourceController::class, 'getProductStock'])->name('connector.product-stock-report');

    // Products
    Route::resource('product', Modules\Connector\Http\Controllers\Api\ProductController::class)->only('index', 'show')->names([
        'index' => 'connector.product.index',
        'show' => 'connector.product.show',
    ]);
    Route::get('selling-price-group', [Modules\Connector\Http\Controllers\Api\ProductController::class, 'getSellingPriceGroup'])->name('connector.product.selling-price-group');
    Route::get('variation/{id?}', [Modules\Connector\Http\Controllers\Api\ProductController::class, 'listVariations'])->name('connector.product.variation');

    // Customers/Contacts
    Route::resource('contactapi', Modules\Connector\Http\Controllers\Api\ContactController::class)->only('index', 'show', 'store', 'update')->names([
        'index' => 'connector.contactapi.index',
        'show' => 'connector.contactapi.show',
        'store' => 'connector.contactapi.store',
        'update' => 'connector.contactapi.update',
    ]);
    Route::post('contactapi-payment', [Modules\Connector\Http\Controllers\Api\ContactController::class, 'contactPay'])->name('connector.contactapi.payment');

    // Sales/Transactions
    Route::resource('sell', Modules\Connector\Http\Controllers\Api\SellController::class)->only('index', 'store', 'show', 'update', 'destroy')->names([
        'index' => 'connector.sell.index',
        'store' => 'connector.sell.store',
        'show' => 'connector.sell.show',
        'update' => 'connector.sell.update',
        'destroy' => 'connector.sell.destroy',
    ]);
    Route::post('sell-return', [Modules\Connector\Http\Controllers\Api\SellController::class, 'addSellReturn'])->name('connector.sell.return');
    Route::get('list-sell-return', [Modules\Connector\Http\Controllers\Api\SellController::class, 'listSellReturn'])->name('connector.sell.return.list');
    Route::post('update-shipping-status', [Modules\Connector\Http\Controllers\Api\SellController::class, 'updateSellShippingStatus'])->name('connector.sell.shipping');

    // Expenses
    Route::resource('expense', Modules\Connector\Http\Controllers\Api\ExpenseController::class)->only('index', 'store', 'show', 'update')->names([
        'index' => 'connector.expense.index',
        'store' => 'connector.expense.store',
        'show' => 'connector.expense.show',
        'update' => 'connector.expense.update',
    ]);
    Route::get('expense-refund', [Modules\Connector\Http\Controllers\Api\ExpenseController::class, 'listExpenseRefund'])->name('connector.expense.refund');
    Route::get('expense-categories', [Modules\Connector\Http\Controllers\Api\ExpenseController::class, 'listExpenseCategories'])->name('connector.expense.categories');

    // Payments
    Route::get('payment-accounts', [Modules\Connector\Http\Controllers\Api\CommonResourceController::class, 'getPaymentAccounts'])->name('connector.payment.accounts');
    Route::get('payment-methods', [Modules\Connector\Http\Controllers\Api\CommonResourceController::class, 'getPaymentMethods'])->name('connector.payment.methods');

    // Cash register
    Route::resource('cash-register', Modules\Connector\Http\Controllers\Api\CashRegisterController::class)->only('index', 'store', 'show', 'update')->names([
        'index' => 'connector.cash-register.index',
        'store' => 'connector.cash-register.store',
        'show' => 'connector.cash-register.show',
        'update' => 'connector.cash-register.update',
    ]);

    // Categories, Units, Brands, Tax
    Route::resource('taxonomy', 'Modules\Connector\Http\Controllers\Api\CategoryController')->only('index', 'show')->names([
        'index' => 'connector.taxonomy.index',
        'show' => 'connector.taxonomy.show',
    ]);
    Route::resource('unit', Modules\Connector\Http\Controllers\Api\UnitController::class)->only('index', 'show')->names([
        'index' => 'connector.unit.index',
        'show' => 'connector.unit.show',
    ]);
    Route::resource('brand', Modules\Connector\Http\Controllers\Api\BrandController::class)->only('index', 'show')->names([
        'index' => 'connector.brand.index',
        'show' => 'connector.brand.show',
    ]);
    Route::resource('tax', 'Modules\Connector\Http\Controllers\Api\TaxController')->only('index', 'show')->names([
        'index' => 'connector.tax.index',
        'show' => 'connector.tax.show',
    ]);

    // Tables and Services
    Route::resource('table', Modules\Connector\Http\Controllers\Api\TableController::class)->only('index', 'show')->names([
        'index' => 'connector.table.index',
        'show' => 'connector.table.show',
    ]);
    Route::resource('types-of-service', Modules\Connector\Http\Controllers\Api\TypesOfServiceController::class)->only('index', 'show')->names([
        'index' => 'connector.types-of-service.index',
        'show' => 'connector.types-of-service.show',
    ]);

    // Notifications
    Route::get('notifications', [Modules\Connector\Http\Controllers\Api\CommonResourceController::class, 'getNotifications'])->name('connector.notifications');
    Route::get('get-location', [Modules\Connector\Http\Controllers\Api\CommonResourceController::class, 'getLocation'])->name('connector.location');

    // Subscriptions and packages
    Route::get('active-subscription', [Modules\Connector\Http\Controllers\Api\SuperadminController::class, 'getActiveSubscription'])->name('connector.subscription.active');
    Route::get('packages', [Modules\Connector\Http\Controllers\Api\SuperadminController::class, 'getPackages'])->name('connector.packages');

    // Attendance
    Route::get('get-attendance/{user_id}', [Modules\Connector\Http\Controllers\Api\AttendanceController::class, 'getAttendance'])->name('connector.attendance.get');
    Route::post('clock-in', [Modules\Connector\Http\Controllers\Api\AttendanceController::class, 'clockin'])->name('connector.attendance.clockin');
    Route::post('clock-out', [Modules\Connector\Http\Controllers\Api\AttendanceController::class, 'clockout'])->name('connector.attendance.clockout');
    Route::get('holidays', [Modules\Connector\Http\Controllers\Api\AttendanceController::class, 'getHolidays'])->name('connector.holidays');

    // Product sell helpers
    Route::get('new_product', [Modules\Connector\Http\Controllers\Api\ProductSellController::class, 'newProduct'])->name('connector.new_product');
    Route::get('new_sell', [Modules\Connector\Http\Controllers\Api\ProductSellController::class, 'newSell'])->name('connector.new_sell');
    Route::get('new_contactapi', [Modules\Connector\Http\Controllers\Api\ProductSellController::class, 'newContactApi'])->name('connector.new_contactapi');
});

// CRM Routes
Route::middleware('auth:api', 'timezone')->prefix('connector/api/crm')->group(function () {
    Route::resource('follow-ups', 'Modules\Connector\Http\Controllers\Api\Crm\FollowUpController')->only('index', 'store', 'show', 'update')->names([
        'index' => 'connector.follow-ups.index',
        'store' => 'connector.follow-ups.store',
        'show' => 'connector.follow-ups.show',
        'update' => 'connector.follow-ups.update',
    ]);
    Route::get('follow-up-resources', [Modules\Connector\Http\Controllers\Api\Crm\FollowUpController::class, 'getFollowUpResources'])->name('connector.follow-up-resources');
    Route::get('leads', [Modules\Connector\Http\Controllers\Api\Crm\FollowUpController::class, 'getLeads'])->name('connector.leads');
    Route::post('call-logs', [Modules\Connector\Http\Controllers\Api\Crm\CallLogsController::class, 'saveCallLogs'])->name('connector.call-logs');
});

// Field force routes
Route::middleware('auth:api', 'timezone')->prefix('connector/api')->group(function () {
    Route::get('field-force', [Modules\Connector\Http\Controllers\Api\FieldForce\FieldForceController::class, 'index'])->name('connector.field-force.index');
    Route::post('field-force/create', [Modules\Connector\Http\Controllers\Api\FieldForce\FieldForceController::class, 'store'])->name('connector.field-force.store');
    Route::post('field-force/update-visit-status/{id}', [Modules\Connector\Http\Controllers\Api\FieldForce\FieldForceController::class, 'updateStatus'])->name('connector.field-force.status');
});
