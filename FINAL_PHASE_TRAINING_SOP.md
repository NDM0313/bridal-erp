# Final Phase: User Training SOPs

**Date**: January 8, 2026  
**Status**: ✅ **TRAINING MATERIALS READY**  
**Audience**: Production Workers, Sales Users, Admin/Manager

---

## Overview

Simple, step-by-step training guides for each user role.  
**Language**: Non-technical, mobile-first, practical.

---

## A. Production Worker Training

### Who This Is For
- Dyer workers
- Handwork workers
- Stitching workers
- Any worker assigned to production steps

### Device
- Mobile app (Android or iOS)

---

### Step 1: Login

1. Open the mobile app
2. Enter your **email** (provided by admin)
3. Enter your **password** (provided by admin)
4. Tap **"Sign In"**
5. You will see **"My Assigned Steps"** screen

**✅ Success**: You see a list of steps assigned to you

**❌ Problem**: If you cannot login, contact admin

---

### Step 2: View Assigned Steps

1. After login, you will see **"My Assigned Steps"** screen
2. Each step shows:
   - **Order Number** (e.g., PO-INV-202601-0001)
   - **Step Name** (Dyeing, Handwork, or Stitching)
   - **Progress** (e.g., 40 / 100)
   - **Status** (pending, in_progress, or completed)

3. **Pull down** to refresh the list

**✅ Success**: You see all your assigned steps

**❌ Problem**: If list is empty, you have no assigned steps (contact admin)

---

### Step 3: Update Quantity Progress

1. Tap on a step to open details
2. You will see:
   - Order number
   - Step name
   - Current completed quantity
   - Step quantity (total)

3. In **"Update Progress"** section:
   - Enter the **completed quantity** (e.g., 50)
   - Tap **"Update Progress"**

4. Wait for **"Success"** message

**✅ Success**: Progress updated, status may change to "in_progress"

**❌ Problem**: 
- If error says "cannot exceed step quantity" → Enter a smaller number
- If error says "session expired" → Logout and login again

---

### Step 4: Mark Step as In Progress

1. Open step details
2. If status is **"pending"**:
   - Tap **"Mark as In Progress"**
   - Wait for success message

**✅ Success**: Status changed to "in_progress"

---

### Step 5: Complete a Step

1. Open step details
2. Update completed quantity to **equal step quantity**
   - Example: If step quantity is 100, enter 100 in completed quantity
3. Tap **"Update Progress"**
4. Then tap **"Mark as Completed"**

**✅ Success**: Status changed to "completed", step is done

**❌ Problem**: 
- If error says "completed_qty must equal step_qty" → Update quantity first
- You cannot mark as completed if quantity is not 100%

---

### Daily Workflow

**Morning**:
1. Login
2. Check assigned steps
3. Start working on a step

**During Work**:
1. Update completed quantity as you work
2. Mark step as "in_progress" when you start

**End of Day**:
1. Update final completed quantity
2. Mark step as "completed" if finished
3. Logout

---

### Important Rules

**✅ DO**:
- Update quantity regularly (don't wait until end)
- Mark step as "in_progress" when you start
- Complete step only when 100% done

**❌ DON'T**:
- Don't update other workers' steps
- Don't mark as completed if not 100% done
- Don't enter quantity more than step quantity

---

## B. Sales User Training

### Who This Is For
- Cashiers
- Sales staff
- Anyone who creates sales

### Device
- Mobile app OR Web app

---

### Step 1: Login

1. Open app (mobile or web)
2. Enter your **email**
3. Enter your **password**
4. Tap **"Sign In"**
5. You will see **"Home"** screen

**✅ Success**: You see "Create Sale" and "View Sales" options

---

### Step 2: Create Normal Sale

1. Tap **"Create Sale"**
2. Select **products** (search or browse)
3. Enter **quantity** for each product
4. Select **customer** (optional)
5. Select **payment method** (Cash, Card, etc.)
6. Tap **"Create Sale (Draft)"**

**✅ Success**: Sale created, you can see it in "View Sales"

**Note**: Draft sale does NOT deduct stock yet

---

### Step 3: Finalize Sale

1. Go to **"View Sales"**
2. Find your draft sale
3. Tap on it
4. Tap **"Finalize Sale"**

**✅ Success**: Sale finalized, stock deducted, production order created (if studio sale)

**❌ Problem**: 
- If error says "Insufficient stock" → Reduce quantity or contact admin
- If error says "session expired" → Logout and login again

---

### Step 4: Create Studio Sale

1. Create sale as normal (Step 2)
2. Make sure at least one product has **"Requires Production"** flag
3. Finalize sale (Step 3)
4. System will **automatically** create production order

**✅ Success**: Production order created, you can see it in production module (admin only)

**Note**: You don't need to do anything extra for studio sales

---

### Step 5: Handle WhatsApp Order

1. When customer sends WhatsApp message:
   - Admin will create a **Lead** from message
   - You will see lead in system (if configured)

2. Create sale from lead:
   - Select customer (from WhatsApp number)
   - Add products
   - Create sale as normal

3. Finalize sale

**✅ Success**: Sale created from WhatsApp order

---

### Daily Workflow

**Morning**:
1. Login
2. Check for draft sales (complete if needed)

**During Day**:
1. Create sales as customers come
2. Finalize sales immediately (or keep as draft if needed)

**End of Day**:
1. Finalize all draft sales
2. Review sales list
3. Logout

---

### Important Rules

**✅ DO**:
- Finalize sales immediately (don't keep too many drafts)
- Select correct branch before creating sale
- Verify product quantities before finalizing

**❌ DON'T**:
- Don't create sale in wrong branch
- Don't finalize sale without verifying stock
- Don't delete finalized sales

---

## C. Admin / Manager Training

### Who This Is For
- Business owners
- Managers
- Administrators

### Device
- Web app (recommended) OR Mobile app

---

### Step 1: Login & Dashboard

1. Open web app
2. Login with admin credentials
3. You will see **Dashboard** with:
   - Sales summary
   - Production overview
   - Studio dashboard counts
   - Reports

**✅ Success**: You see all modules and data

---

### Step 2: Monitor Sales

1. Go to **"Sales"** module
2. View all sales (filter by branch, date, status)
3. Check:
   - Sales totals
   - Payment status
   - Branch-wise sales

**✅ Success**: You can see all sales data

---

### Step 3: Monitor Production

1. Go to **"Production"** or **"Studio"** module
2. View:
   - Production orders
   - Step status (Dyeing, Handwork, Stitching)
   - Dashboard counts

3. Check:
   - Which steps are pending
   - Which steps are in progress
   - Which orders are completed

**✅ Success**: You can see production status

---

### Step 4: Enter Production Costs

1. Go to **"Production"** module
2. Open a production order
3. Click on a **production step** (e.g., Dyeing)
4. Enter **cost** (e.g., Rs. 5,000)
5. Save

**✅ Success**: Cost saved, will auto-create expense when step is completed

**Note**: Cost can be entered anytime, but expense is created only when step is completed

---

### Step 5: View Reports

1. Go to **"Reports"** module
2. Select report type:
   - Sales reports
   - Production cost reports
   - Profit reports

3. Apply filters:
   - Date range
   - Branch
   - Status

4. View/download report

**✅ Success**: You can see business reports

---

### Step 6: Handle Exceptions

**If worker cannot update step**:
1. Check if step is assigned to correct worker
2. Check if worker has correct role
3. Verify step status (cannot update if completed)

**If sale not creating production order**:
1. Check if product has `requires_production = true`
2. Check if sale status = 'final'
3. Verify production_orders table

**If cost not creating expense**:
1. Check if step cost > 0
2. Check if step status = 'completed'
3. Verify expense_categories table (must have "Production Cost")

**If WhatsApp not working**:
1. Check webhook configuration
2. Verify WhatsApp API credentials
3. Check social_messages table for logs

---

### Daily Workflow

**Morning**:
1. Login
2. Check dashboard
3. Review overnight sales/production

**During Day**:
1. Monitor sales activity
2. Monitor production progress
3. Enter costs as needed
4. Handle exceptions

**End of Day**:
1. Review daily reports
2. Verify data accuracy
3. Check for errors in logs
4. Plan next day

---

### Important Rules

**✅ DO**:
- Monitor dashboard daily
- Enter costs promptly
- Verify data accuracy regularly
- Handle exceptions quickly

**❌ DON'T**:
- Don't delete finalized sales
- Don't modify production steps directly in database
- Don't change user roles without reason
- Don't ignore error messages

---

## General Training Tips

### For All Users

1. **Login Issues**:
   - Check email/password
   - Contact admin if locked out

2. **Slow Performance**:
   - Check internet connection
   - Refresh page/app
   - Contact admin if persistent

3. **Data Not Showing**:
   - Check branch selection (if applicable)
   - Refresh page/app
   - Contact admin if issue persists

4. **Error Messages**:
   - Read error message carefully
   - Try again if it's a temporary issue
   - Contact admin if error persists

---

## Training Schedule

### Day 1: Introduction (2 hours)
- System overview
- Login for all users
- Basic navigation

### Day 2: Role-Specific Training (3 hours)
- Production Worker: Steps workflow
- Sales User: Sale creation
- Admin: Dashboard and reports

### Day 3: Practice (2 hours)
- Users practice their workflows
- Admin monitors and helps

### Day 4: Q&A & Troubleshooting (1 hour)
- Answer questions
- Address concerns
- Final review

---

## Training Checklist

### Production Worker
- [ ] Can login
- [ ] Can view assigned steps
- [ ] Can update quantity
- [ ] Can mark step as in_progress
- [ ] Can complete step
- [ ] Understands daily workflow

### Sales User
- [ ] Can login
- [ ] Can create normal sale
- [ ] Can create studio sale
- [ ] Can finalize sale
- [ ] Can view sales list
- [ ] Understands branch selection

### Admin/Manager
- [ ] Can login
- [ ] Can view dashboard
- [ ] Can monitor sales
- [ ] Can monitor production
- [ ] Can enter costs
- [ ] Can view reports
- [ ] Can handle exceptions

---

**Status**: ✅ **Training Materials Ready**  
**Next**: Conduct Training → Pilot Run → Go-Live

---

**Last Updated**: January 8, 2026
