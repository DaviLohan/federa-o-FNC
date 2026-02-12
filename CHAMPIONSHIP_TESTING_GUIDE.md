# Championship Testing Guide

## 🎯 Overview
This guide will walk you through comprehensive testing of the FNC championship system, including permissions, state transitions, and all user types.

---

## 📋 Test Environment Setup

### Test Data Created

#### **Championships**
1. **Copa FNC 2026** (LEAGUE)
   - Status: OPEN
   - Type: Liga (pontos corridos)
   - Max Teams: 4
   - Min Teams: 2
   - Prize Pool: R$ 5,000.00
   - Enrollment Fee: R$ 100.00
   - Enrollment Period: Today to +5 days
   - Start Date: +7 days from today

2. **Torneio Relâmpago** (KNOCKOUT)
   - Status: OPEN
   - Type: Eliminatória (mata-mata)
   - Max Teams: 4
   - Min Teams: 2
   - Prize Pool: R$ 2,000.00
   - Enrollment Fee: R$ 50.00
   - Enrollment Period: Today to +10 days
   - Start Date: +14 days from today

#### **Teams Enrolled (All 4 teams in both championships)**
- ✅ Champions Team (Owner: Pedro Oliveira / player3@fnc.com)
- ✅ Legends United (Owner: João Santos / player2@fnc.com)
- ✅ Thunder FC (Owner: Carlos Silva / player1@fnc.com)
- ✅ FNC Elite (Owner: Novo Teste / novoteste@fnc.com)

All enrollments are **APPROVED** and **PAID**.

---

## 🧪 Test Scenarios

### **Test 1: ADMIN Access** ✅

**Login Credentials:**
```
Email: admin@fnc.com
Password: [your admin password]
```

**Expected Behavior:**
1. Navigate to: `http://localhost:3000/championships`
2. ✅ Should see both championships listed
3. ✅ Should see "Criar Campeonato" button (top right)
4. ✅ For each OPEN championship, should see these buttons:
   - **Editar** (gray)
   - **Inscrever Time** (blue/brand)
   - **Iniciar** (green)
5. ✅ Can click any of these buttons

**Test Actions:**
- [ ] View championships list
- [ ] Click "Editar" on Copa FNC 2026 - should open edit modal
- [ ] Close modal without saving
- [ ] Click "Inscrever Time" - should open enrollment modal (even though all teams already enrolled)
- [ ] Close modal without enrolling

---

### **Test 2: SUPERVISOR Access** ✅

**Login Credentials:**
```
Email: supervisor@fnc.com
Password: supervisor123
```

**Expected Behavior:**
1. Navigate to: `http://localhost:3000/championships`
2. ✅ Should see both championships listed
3. ✅ Should see "Criar Campeonato" button (top right)
4. ✅ For each OPEN championship, should see these buttons:
   - **Editar** (gray)
   - **Inscrever Time** (blue/brand)
   - **Iniciar** (green)
5. ✅ Same permissions as ADMIN for championships
6. ❌ CANNOT access Django admin at `http://localhost:8000/admin/`

**Test Actions:**
- [ ] View championships list
- [ ] Verify "Criar Campeonato" button is visible
- [ ] Try to access `http://localhost:8000/admin/` - should get 403 or redirect
- [ ] Verify buttons are identical to ADMIN view

---

### **Test 3: TEAM_OWNER (Manager) Access** ✅

**Login Credentials:**
```
Email: player1@fnc.com
Password: player123
Team: Thunder FC (already enrolled in both)
```

**Expected Behavior:**
1. Navigate to: `http://localhost:3000/championships`
2. ✅ Should see both championships listed
3. ❌ Should NOT see "Criar Campeonato" button
4. ✅ For each OPEN championship, should ONLY see:
   - **Inscrever Time** (blue/brand)
5. ❌ Should NOT see:
   - "Editar" button
   - "Iniciar" button
   - "Finalizar" button

**Test Actions:**
- [ ] View championships list
- [ ] Verify "Criar Campeonato" button is NOT visible
- [ ] Verify ONLY "Inscrever Time" button is visible
- [ ] Click "Inscrever Time" on Copa FNC 2026
- [ ] Should see enrollment modal with dropdown
- [ ] Should see "Thunder FC (3 jogadores)" in dropdown
- [ ] Try to enroll Thunder FC (should fail - already enrolled)
- [ ] Close modal

**Alternative Test (with new team):**
```
Email: player4@fnc.com (no teams owned)
Password: player123
```
- [ ] Login with player4@fnc.com
- [ ] Go to championships
- [ ] Click "Inscrever Time"
- [ ] Should see message: "Você não possui times cadastrados"

---

### **Test 4: PLAYER (View-Only) Access** ✅

**Login Credentials:**
```
Email: player4@fnc.com
Password: player123
Player: LucasGoal (member of Thunder FC, but not owner)
```

**Expected Behavior:**
1. Navigate to: `http://localhost:3000/championships`
2. ✅ Should see both championships listed
3. ❌ Should NOT see "Criar Campeonato" button
4. ❌ Should NOT see any action buttons (Editar, Inscrever, Iniciar)
5. ✅ Should see text: "Apenas visualização" (italic, gray)

**Test Actions:**
- [ ] View championships list
- [ ] Verify "Criar Campeonato" button is NOT visible
- [ ] Verify NO action buttons are visible
- [ ] Verify "Apenas visualização" text appears for each championship
- [ ] Can view championship details (read-only)

---

### **Test 5: Championship State Transitions** ✅

**Login as ADMIN or SUPERVISOR:**
```
Email: admin@fnc.com or supervisor@fnc.com
```

#### **A. OPEN → IN_PROGRESS**

1. Navigate to: `http://localhost:3000/championships`
2. Find **Copa FNC 2026** (Status: Aberto)
3. Click **"Iniciar"** button
4. Confirm the action in the popup/alert
5. ✅ Expected Results:
   - Championship status changes to "Em Andamento"
   - "Iniciar" button disappears
   - "Finalizar" button appears (orange/warning)
   - "Inscrever Time" button disappears (enrollments closed)
   - Toast notification: "Campeonato iniciado!"
   - Backend creates Standings table with 4 teams (LEAGUE type)
   - Backend generates matches for the league

**Check Backend:**
```bash
cd /home/davilohan/projects/FNC/backend
source venv/bin/activate
python manage.py shell
```
```python
from fnc_championships.models import Championship, Standings
from fnc_matches.models import Match

# Verify championship status
copa = Championship.objects.get(name='Copa FNC 2026')
print(f"Status: {copa.status}")  # Should be IN_PROGRESS

# Verify standings were created
standings = Standings.objects.filter(championship=copa)
print(f"Teams in standings: {standings.count()}")  # Should be 4

# Verify matches were created
matches = Match.objects.filter(championship=copa)
print(f"Matches created: {matches.count()}")  # Should be > 0
```

#### **B. IN_PROGRESS → FINISHED**

1. With **Copa FNC 2026** now IN_PROGRESS
2. Click **"Finalizar"** button (orange/warning color)
3. Confirm the action in the popup/alert
4. ✅ Expected Results:
   - Championship status changes to "Finalizado"
   - "Finalizar" button disappears
   - ALL action buttons disappear (read-only state)
   - Toast notification: "Campeonato finalizado!"
   - `end_date` is set to current timestamp

**Check Backend:**
```python
copa = Championship.objects.get(name='Copa FNC 2026')
print(f"Status: {copa.status}")  # Should be FINISHED
print(f"End Date: {copa.end_date}")  # Should be current timestamp
```

---

### **Test 6: Enrollment Limits** ⚠️

This test requires creating a new championship with `max_teams=2`.

**Login as ADMIN or SUPERVISOR**

**Create Test Championship:**
1. Click "Criar Campeonato"
2. Fill in:
   - Name: "Test Enrollment Limit"
   - Type: LEAGUE
   - Max Teams: **2**
   - Min Teams: 2
   - Prize Pool: 1000.00
   - Enrollment Fee: 50.00
   - Set dates (today, +3 days, +5 days)
3. Save

**Test Enrollment Limit:**
1. Login as `player1@fnc.com` (Thunder FC owner)
2. Enroll Thunder FC in "Test Enrollment Limit"
3. Logout, login as `player2@fnc.com` (Legends United owner)
4. Enroll Legends United in "Test Enrollment Limit"
5. ✅ Championship should now show: 2/2 teams enrolled
6. Logout, login as `player3@fnc.com` (Champions Team owner)
7. Try to enroll Champions Team
8. ✅ Should get error: "Campeonato já atingiu o número máximo de times"

---

### **Test 7: Minimum Teams Validation** ⚠️

**Create Test Championship:**
1. Login as ADMIN
2. Create championship with `min_teams=3`, `max_teams=4`
3. Enroll only 2 teams
4. Try to click "Iniciar"
5. ✅ Should get error: "Mínimo de 3 times necessários."

---

### **Test 8: User Type Promotion** ✅ (Already tested)

**Verify PLAYER → TEAM_OWNER promotion:**
1. Create new user as PLAYER (register normally)
2. User creates their first team
3. ✅ User is automatically promoted to TEAM_OWNER
4. User can now see "Inscrever Time" buttons on championships

---

### **Test 9: Teams Visibility After Invitation** ✅ (Already fixed)

**Verify teams show for members:**
1. Login as `davilohan61@gmail.com` (member of FNC Elite)
2. Navigate to: `http://localhost:3000/teams`
3. ✅ Should see "FNC Elite" in the teams list
4. ✅ Should NOT see "Thunder FC, Legends United, Champions Team" (not a member)

---

### **Test 10: Profile Saving** ✅ (Already fixed)

**Verify profile changes save:**
1. Login as any user with player_profile
2. Navigate to: `http://localhost:3000/profile`
3. Change "Posição Favorita" (favorite position)
4. Click "Salvar Alterações"
5. ✅ Changes should save and immediately reflect in UI
6. Refresh page
7. ✅ Changes should persist

---

## 🎨 UI/UX Verification

### **Championships Page Layout**

**For all user types:**
- [ ] Page title: "Campeonatos"
- [ ] Subtitle: "Gerencie campeonatos e inscrições"
- [ ] Status filter dropdown (Todos, Rascunho, Aberto, Em Andamento, Finalizado)
- [ ] Table with columns: Campeonato, Tipo, Times, Status, Início, Prêmio, Ações

**For ADMIN/SUPERVISOR:**
- [ ] "Criar Campeonato" button (top right, purple/brand)

**Championship Cards/Rows:**
- [ ] Name + description (truncated)
- [ ] Type badge: "Liga" or "Eliminatória"
- [ ] Teams count: X/Y (or X/∞)
- [ ] Status badge with colors:
  - Rascunho (gray)
  - Aberto (green)
  - Em Andamento (blue)
  - Finalizado (orange)
  - Cancelado (red)
- [ ] Start date (formatted as DD/MM/YYYY)
- [ ] Prize pool (formatted as R$ X.XX)

---

## 🐛 Known Issues / Edge Cases to Watch

### **1. Timezone Warnings**
When creating championships, you may see warnings about naive datetimes. This is a known issue but doesn't affect functionality.

### **2. Championship Type Mismatch**
The backend uses `championship_type` (LEAGUE/KNOCKOUT) but old views.py referenced `format`. This has been fixed.

### **3. Enrollment Status vs Payment Status**
- `status`: PENDING/APPROVED/REJECTED/CANCELLED
- `payment_status`: PENDING/PAID/FAILED

For testing, all enrollments are set to `status='APPROVED'` and `payment_status='PAID'`.

### **4. Match Generation**
- **LEAGUE:** Generates all matches (round-robin, ida e volta)
- **KNOCKOUT:** Generates only first round matches initially

---

## 📊 Success Criteria

All tests pass if:

✅ **Permissions:**
- ADMIN: Full access to everything including Django admin
- SUPERVISOR: Full championship management but NO Django admin
- TEAM_OWNER: Can enroll teams, view championships
- PLAYER: View-only access

✅ **State Transitions:**
- OPEN → IN_PROGRESS works correctly
- IN_PROGRESS → FINISHED works correctly
- Buttons appear/disappear appropriately

✅ **Enrollments:**
- Teams can enroll successfully
- Enrollment limits are enforced
- Minimum teams validation works

✅ **UI/UX:**
- All buttons render for correct user types
- No console errors in browser
- Toasts appear with correct messages
- Data refreshes without page reload

✅ **Data Integrity:**
- Teams show for owners AND members
- Profile changes save and persist
- Championship data is consistent

---

## 🚀 Quick Testing Commands

### **View Championships in Database:**
```bash
cd /home/davilohan/projects/FNC/backend
source venv/bin/activate
python manage.py shell
```
```python
from fnc_championships.models import Championship, ChampionshipEnrollment

# List all championships
for c in Championship.objects.all():
    print(f"{c.id}. {c.name} - {c.status} - {c.championship_type}")
    enrollments = c.enrollments.filter(status='APPROVED').count()
    print(f"   Enrollments: {enrollments}/{c.max_teams}")
```

### **View Teams:**
```python
from fnc_teams.models import Team

for t in Team.objects.all():
    print(f"{t.id}. {t.name} ({t.abbreviation}) - Owner: {t.owner.get_full_name()}")
    members = t.teammembership_set.filter(is_active=True).count()
    print(f"   Members: {members}")
```

### **Reset Championships (if needed):**
```python
# Delete all championships
Championship.objects.all().delete()

# Then run the creation script again
# python manage.py shell < create_test_championships.py
# python manage.py shell < enroll_teams_in_championships.py
```

---

## 📝 Test Results Log

### **Date:** [Fill in when testing]

| Test | Status | Notes |
|------|--------|-------|
| Test 1: ADMIN Access | ⬜ | |
| Test 2: SUPERVISOR Access | ⬜ | |
| Test 3: TEAM_OWNER Access | ⬜ | |
| Test 4: PLAYER Access | ⬜ | |
| Test 5: State Transitions | ⬜ | |
| Test 6: Enrollment Limits | ⬜ | |
| Test 7: Minimum Teams | ⬜ | |
| Test 8: User Promotion | ✅ | Already verified |
| Test 9: Team Visibility | ✅ | Already fixed |
| Test 10: Profile Saving | ✅ | Already fixed |

**Legend:**
- ⬜ Not tested
- ✅ Passed
- ❌ Failed
- ⚠️ Partial/Issues

---

## 🎯 Next Steps After Testing

If all tests pass:
1. ✅ Championship system is production-ready
2. ✅ User type permissions are working correctly
3. ✅ State machine is functioning properly
4. ✅ Data integrity is maintained

If issues are found:
1. Document the issue in test log
2. Create bug report with steps to reproduce
3. Fix and retest

---

## 🔗 Quick Links

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000/api/v1/
- **Django Admin:** http://localhost:8000/admin/ (ADMIN only)
- **Championships:** http://localhost:3000/championships
- **Teams:** http://localhost:3000/teams
- **Profile:** http://localhost:3000/profile

---

**Happy Testing! 🚀**
