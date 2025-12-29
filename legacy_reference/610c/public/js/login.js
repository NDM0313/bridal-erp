var recaptchaRendered = false;

$(document).ready(function() {
    $('[data-toggle="tooltip"]').tooltip();

    // IMPORTANT: Add form submit handler BEFORE jQuery Steps initialization
    // This ensures the form submits when user clicks the finish button
    $('#business_register_form').on('submit', function(e) {
        console.log('Form submit event triggered');
        
        // Let the form submit normally - don't prevent it
        // The validation should have already happened in jQuery Steps
        return true;
    });

    // registration form steps start
    if ($('#business_register_form').length) {
        var form = $('#business_register_form').show();
        
        form.steps({
            headerTag: 'h3',
            bodyTag: 'fieldset',
            transitionEffect: 'slideLeft',
            labels: {
                finish: LANG.register,
                next: LANG.next,
                previous: LANG.previous,
            },
            onStepChanging: function(event, currentIndex, newIndex) {
                console.log('onStepChanging: from step ' + currentIndex + ' to step ' + newIndex);
                
                // Always allow previous action even if the current form is not valid!
                if (currentIndex > newIndex) {
                    console.log('Going to previous step - allowing without validation');
                    return true;
                }
                
                // Check if this is the finish action (clicking finish button)
                var totalSteps = form.find('fieldset').length;
                if (newIndex >= totalSteps) {
                    // This is the finish button, don't prevent it here
                    // Let onFinishing handle the validation
                    console.log('Finish button detected (newIndex=' + newIndex + ', totalSteps=' + totalSteps + ')');
                    return true;
                }
                
                console.log('Moving to next step - validating current step');
                
                // Needed in some cases if the user went back (clean up)
                if (currentIndex < newIndex) {
                    // To remove error styles
                    form.find('.body:eq(' + newIndex + ') label.error').remove();
                    form.find('.body:eq(' + newIndex + ') .error').removeClass('error');
                }
                
                form.validate().settings.ignore = ':disabled,:hidden';
                var isValid = form.valid();
                
                if (!isValid) {
                    console.log('Validation failed when moving from step ' + currentIndex + ' to ' + newIndex);
                    var errors = form.validate().errorList;
                    errors.forEach(function(error) {
                        console.log('Field: ' + error.element.name + ' - Error: ' + error.message);
                    });
                }
                
                return isValid;
            },
            onStepChanged: function(event, currentIndex, priorIndex) {
                console.log('Step changed to: ' + currentIndex);
                // Render reCAPTCHA on last step
                if (currentIndex === 2 && !recaptchaRendered) {
                    console.log('Attempting to render reCAPTCHA on step 2');
                    try {
                        // Check if the reCAPTCHA container exists and reCAPTCHA is loaded
                        var recaptchaContainer = document.getElementById('recaptcha-container');
                        if (recaptchaContainer && typeof grecaptcha !== 'undefined' && window.RECAPTCHA_SITE_KEY) {
                            console.log('reCAPTCHA container found, rendering...');
                            grecaptcha.render('recaptcha-container', {
                                'sitekey': window.RECAPTCHA_SITE_KEY
                            });
                            recaptchaRendered = true;
                        } else {
                            console.log('reCAPTCHA not available - container exists: ' + !!recaptchaContainer + ', grecaptcha: ' + (typeof grecaptcha) + ', sitekey: ' + !!window.RECAPTCHA_SITE_KEY);
                        }
                    } catch (e) {
                        console.error('Error rendering reCAPTCHA:', e);
                        // Continue anyway - reCAPTCHA is optional
                    }
                }
            },
            onFinishing: function(event, currentIndex) {
                console.log('=== FINAL VALIDATION - onFinishing triggered ===');
                
                // Set to validate all fields
                form.validate().settings.ignore = '';
                
                // Validate all form fields
                var isValid = form.valid();
                console.log('Final validation result: ' + isValid);
                
                if (!isValid) {
                    console.log('Validation FAILED - showing errors');
                    var errors = form.validate().errorList;
                    console.log('Error count: ' + errors.length);
                    
                    // Display errors in error container
                    var errorContainer = document.getElementById('form-error-container');
                    var errorList = document.getElementById('form-error-list');
                    if (errorContainer && errorList) {
                        errorList.innerHTML = '';
                        errors.forEach(function(error) {
                            console.log('  - ' + error.element.name + ': ' + error.message);
                            var li = document.createElement('li');
                            li.textContent = error.element.name + ': ' + error.message;
                            errorList.appendChild(li);
                        });
                        errorContainer.style.display = 'block';
                        // Scroll to errors
                        errorContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                } else {
                    console.log('✓ All validation PASSED - form is ready to submit');
                    // Hide error container
                    var errorContainer = document.getElementById('form-error-container');
                    if (errorContainer) {
                        errorContainer.style.display = 'none';
                    }
                }
                
                return isValid;
            },
            onFinished: function(event, currentIndex) {
                console.log('=== onFinished callback triggered - SUBMITTING FORM ===');
                
                var formElement = document.getElementById('business_register_form');
                if (!formElement) {
                    console.error('CRITICAL: Form element not found!');
                    alert('Error: Form not found. Please try again.');
                    return false;
                }
                
                // Double-check validation one more time
                if (!form.valid()) {
                    console.log('ERROR: Form is still not valid, blocking submission');
                    return false;
                }
                
                console.log('All checks passed - submitting form via AJAX');
                
                // Get form data
                var formData = new FormData(formElement);
                
                // Submit via AJAX to get JSON response
                fetch(formElement.action, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                })
                .then(response => {
                    console.log('Form submission response status:', response.status);
                    return response.json();
                })
                .then(data => {
                    console.log('Response data:', data);
                    
                    if (data.success) {
                        console.log('✓ Registration successful!');
                        // Show success message
                        var errorContainer = document.getElementById('form-error-container');
                        if (errorContainer) {
                            errorContainer.style.display = 'none';
                        }
                        
                        // Show success alert and redirect
                        alert(data.msg || 'Business registered successfully!');
                        
                        // Redirect to login or payment page
                        if (data.redirect) {
                            window.location.href = data.redirect;
                        }
                    } else {
                        console.error('Registration failed:', data.errors);
                        
                        // Display errors
                        var errorContainer = document.getElementById('form-error-container');
                        var errorList = document.getElementById('form-error-list');
                        
                        if (errorContainer && errorList) {
                            errorList.innerHTML = '';
                            
                            // Handle different error formats
                            if (data.errors && typeof data.errors === 'object') {
                                for (var field in data.errors) {
                                    var messages = data.errors[field];
                                    if (Array.isArray(messages)) {
                                        messages.forEach(function(msg) {
                                            var li = document.createElement('li');
                                            li.textContent = field + ': ' + msg;
                                            errorList.appendChild(li);
                                        });
                                    } else {
                                        var li = document.createElement('li');
                                        li.textContent = field + ': ' + messages;
                                        errorList.appendChild(li);
                                    }
                                }
                            }
                            
                            errorContainer.style.display = 'block';
                            errorContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        }
                        
                        // Re-enable buttons
                        var buttons = formElement.querySelectorAll('button, input[type="submit"], a[href="#finish"]');
                        buttons.forEach(function(btn) {
                            btn.disabled = false;
                        });
                        
                        alert(data.msg || 'Registration failed. Please check the errors and try again.');
                    }
                })
                .catch(error => {
                    console.error('Form submission error:', error);
                    alert('An error occurred during registration. Please try again.');
                    
                    // Re-enable buttons
                    var buttons = formElement.querySelectorAll('button, input[type="submit"], a[href="#finish"]');
                    buttons.forEach(function(btn) {
                        btn.disabled = false;
                    });
                });
                
                return false; // Prevent jQuery Steps' default form submission
            },
        });
        
        form.find('a[href="#previous"]').addClass('tw-dw-btn');
        form.find('a[href="#next"]').addClass('tw-dw-btn tw-dw-btn-primary');
        form.find('a[href="#finish"]').addClass('tw-dw-btn tw-dw-btn-primary');
    }
    // registration form steps end

    //Date picker
    $('.start-date-picker').datepicker({
        autoclose: true,
        endDate: 'today',
    });

    $('form#business_register_form').validate({
        errorPlacement: function(error, element) {
            if (element.parent('.input-group').length) {
                error.insertAfter(element.parent());
            } else if (element.hasClass('input-icheck') && element.parent().hasClass('icheckbox_square-blue')) {
                error.insertAfter(element.parent().parent().parent());
            } else {
                error.insertAfter(element);
            }
        },
        rules: {
            name: 'required',
            currency_id: 'required',
            country: 'required',
            state: 'required',
            city: 'required',
            zip_code: 'required',
            landmark: 'required',
            time_zone: 'required',
            first_name: 'required',
            fy_start_month: 'required',
            accounting_method: 'required',
            email: {
                required: true,
                email: true,
                // Temporarily disable remote validation for testing
                // remote: {
                //     url: '/business/register/check-email',
                //     ...
                // },
            },
            password: {
                required: true,
                minlength: 5,
            },
            password_confirmation: {
                required: true,
                minlength: 5,
                equalTo: '#password',
            },
            username: {
                required: true,
                minlength: 4,
                // Temporarily disable remote validation for testing
                // remote: {
                //     url: '/business/register/check-username',
                //     ...
                // },
            },
            website: {
                url: true,
            },
        },
        messages: {
            name: LANG.specify_business_name,
            email: {
                required: 'Email is required',
                email: 'Please enter a valid email address',
            },
            password: {
                required: 'Password is required',
                minlength: LANG.password_min_length,
            },
            password_confirmation: {
                required: 'Confirm Password is required',
                minlength: LANG.password_min_length,
                equalTo: LANG.password_mismatch,
            },
            username: {
                required: 'Username is required',
                minlength: 'Username must be at least 4 characters',
                remote: LANG.invalid_username,
            },
            first_name: 'First Name is required',
            currency_id: 'Currency is required',
            country: 'Country is required',
            state: 'State is required',
            city: 'City is required',
            zip_code: 'Zip Code is required',
            landmark: 'Landmark is required',
            time_zone: 'Time Zone is required',
            fy_start_month: 'Financial Year Start Month is required',
            accounting_method: 'Accounting Method is required',
            // Do not override email.remote; we use server response via dataFilter
        },
    });

    $('#business_logo').fileinput({
        showUpload: false,
        showPreview: false,
        browseLabel: LANG.file_browse_label,
        removeLabel: LANG.remove,
    });
});
