// =============================================================================
// SCRIPT: Policy Change Notation Tool – UI helpers + note generators
// All form logic, section toggling, appearance theming, and combined-note output.
// =============================================================================

// ===== UTILITIES =====
// Section visibility, conditional panels, dynamic driver rows, field getters,
// copy/clear helpers, and full-form reset.
function toggleSection(sectionId, checkbox) {
  const sec = document.getElementById('sec-' + sectionId);
  const empty = document.getElementById('emptyState');
  if (checkbox.checked) {
    sec.classList.add('visible');
    sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    sec.classList.remove('visible');
  }
  // Show/hide empty state
  const anyVisible = document.querySelectorAll('.form-section.visible').length > 0;
  empty.style.display = anyVisible ? 'none' : 'block';
}

function showCond(id, show) {
  const el = document.getElementById(id);
  if (el) { el.classList.toggle('show', show); }
}

function showIf(radio, condId, checkVal) {
  showCond(condId, radio.value === (checkVal ? radio.value : ''));
}

function showFinancial(prefix, value) {
  document.getElementById(prefix + '-lessor').classList.toggle('show', value === 'Leased');
  document.getElementById(prefix + '-lienholder').classList.toggle('show', value === 'Financed');
}

function showIPDetails(prefix, type) {
  const addEl = document.getElementById(prefix + '-addition-details');
  const remEl = document.getElementById(prefix + '-removal-details');
  if (addEl) addEl.classList.toggle('show', type === 'add' || type === 'amend');
  if (remEl) remEl.classList.toggle('show', type === 'rem');
}

function toggleSection2(id) {
  const el = document.getElementById(id);
  el.classList.toggle('open');
}

function autofillTime(fieldId) {
  const now = new Date();
  const h = now.getHours() % 12 || 12;
  const m = String(now.getMinutes()).padStart(2, '0');
  const ampm = now.getHours() < 12 ? 'am' : 'pm';
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const val = `${h}:${m} ${ampm} on ${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
  document.getElementById(fieldId).value = val;
  if (fieldId === 'global-contactedTime') updateGlobalContactPreview();
}

function addDriverRow(tableId) {
  const table = document.getElementById(tableId);
  const row = document.createElement('div');
  row.className = 'dynamic-row cols3';
  row.innerHTML = `
    <input type="text" placeholder="Driver name" style="padding:6px 8px;border:1px solid #e1e5ec;border-radius:5px;font-family:inherit;font-size:calc(13 * 1rem / 14)">
    <input type="text" placeholder="Insurance carrier" style="padding:6px 8px;border:1px solid #e1e5ec;border-radius:5px;font-family:inherit;font-size:calc(13 * 1rem / 14)">
    <input type="text" placeholder="Policy number" style="padding:6px 8px;border:1px solid #e1e5ec;border-radius:5px;font-family:inherit;font-size:calc(13 * 1rem / 14)">
    <button class="btn-remove-row" onclick="this.parentElement.remove()">×</button>
  `;
  table.appendChild(row);
}

let cpPolicyRowCount = 0;

function addCancelPolicyRow() {
  const table = document.getElementById('cp-policiesTable');
  const n = ++cpPolicyRowCount;
  const row = document.createElement('div');
  row.className = 'dynamic-row cols4';
  row.innerHTML = `
    <input type="text" placeholder="Policy number" style="padding:6px 8px;border:1px solid #e1e5ec;border-radius:5px;font-family:inherit;font-size:calc(13 * 1rem / 14)">
    <label style="display:flex;align-items:center;justify-content:center;gap:4px"><input type="radio" name="cp-policyType-${n}" value="Home"></label>
    <label style="display:flex;align-items:center;justify-content:center;gap:4px"><input type="radio" name="cp-policyType-${n}" value="Auto"></label>
    <label style="display:flex;align-items:center;justify-content:center;gap:4px"><input type="radio" name="cp-policyType-${n}" value="Other"></label>
    <button class="btn-remove-row" onclick="this.parentElement.remove()">×</button>
  `;
  table.appendChild(row);
}

function toggleCancelPolicies(show) {
  showCond('cp-policies-container', show);
  if (show) {
    const table = document.getElementById('cp-policiesTable');
    if (table.querySelectorAll('.dynamic-row').length === 0) {
      addCancelPolicyRow();
      addCancelPolicyRow();
    }
  }
}

function val(id) {
  const el = document.getElementById(id);
  return el ? (el.value || '').trim() : '';
}

function radio(name) {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value : '';
}

function checked(id) {
  const el = document.getElementById(id);
  return el ? el.checked : false;
}

function line(label, value) {
  return value ? `${label}: ${value}\n` : '';
}

function clearNote(secId) {
  document.getElementById('notetext-' + secId).value = '';
  document.getElementById('note-' + secId).style.display = 'none';
}

function copyNote(secId) {
  const ta = document.getElementById('notetext-' + secId);
  navigator.clipboard.writeText(ta.value).catch(() => {
    ta.select(); document.execCommand('copy');
  });
  const btn = document.querySelector(`#note-${secId} .copy-btn`);
  btn.textContent = '✓ Copied!';
  btn.classList.add('copied');
  setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 2000);
}

function showNote(secId, text) {
  const area = document.getElementById('note-' + secId);
  document.getElementById('notetext-' + secId).value = text;
  area.style.display = 'block';
  area.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function resetAll() {
  if (!confirm('Reset all forms? This will clear all entered data.')) return;
  document.querySelectorAll('input[type="text"], textarea').forEach(el => el.value = '');
  document.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(el => el.checked = false);
  document.querySelectorAll('.form-section').forEach(el => el.classList.remove('visible'));
  const globalContactSection = document.getElementById('sec-GlobalContact');
  if (globalContactSection) globalContactSection.classList.add('visible');
  document.querySelectorAll('.conditional').forEach(el => el.classList.remove('show'));
  document.querySelectorAll('.note-output-area').forEach(el => el.style.display = 'none');
  document.getElementById('emptyState').style.display = 'none';
  const allOut = document.getElementById('all-notes-output');
  if (allOut) allOut.value = '';
}

// ===== NOTE GENERATORS =====
// generateNote(sectionId): builds a plain-text note for one form section from its fields.
// Large switch-like if/else covering every sec-* id; used by single and bulk generation.
function generateNote(sectionId, showOutput = true) {
  let note = '';
  const ts = new Date().toLocaleString('en-CA', {hour:'numeric',minute:'2-digit',hour12:true,month:'long',day:'numeric',year:'numeric'});

  if (sectionId === 'GeneralNote') {
    const by = val('gn-contactedBy'), when = val('gn-contactedTime');
    const reason = val('gn-reason'), action = radio('gn-action'), explain = val('gn-explain');
    note = `GENERAL NOTE\n${'─'.repeat(40)}\n`;
    note += line('Called/Emailed by', by);
    note += line('Time', when);
    note += line('Reason/Purpose', reason);
    note += line('Action Required', action);
    if (action === 'Yes') note += line('Action Details', explain);
    note += `\nNote generated: ${ts}`;
  }
  
  else if (sectionId === 'CancelPolicy') {
    note = `CANCEL A POLICY\n${'─'.repeat(40)}\n`;
    note += line('Contacted By', val('cp-contactedBy'));
    note += line('Time', val('cp-contactedTime'));
    note += line('Account Manager', val('cp-accountManager'));
    note += line('Identity Confirmed', checked('cp-confirmIdentity') ? 'Yes' : '');
    note += line('Current Carrier', val('cp-currentCarrier'));
    note += line('Branch Code', val('cp-branchCode'));
    if (checked('cp-confirmPolicies')) {
      const rows = document.querySelectorAll('#cp-policiesTable .dynamic-row');
      const policies = [];
      rows.forEach(r => {
        const num = r.querySelector('input[type="text"]').value.trim();
        const typeInput = r.querySelector('input[type="radio"]:checked');
        const type = typeInput ? typeInput.value : '';
        if (num || type) policies.push(`${num || '(no number)'}${type ? ' – ' + type : ''}`);
      });
      if (policies.length) note += `Policies to Cancel:\n${policies.map(p => `  - ${p}`).join('\n')}\n`;
    }
    note += line('Effective Date', val('cp-effectiveDate'));
    note += line('Total Premium Cancelled', val('cp-totalPremium'));
    note += line('Competitor Premium', val('cp-competitorPremium'));
    note += line('Competitor Market', val('cp-competitorMarket'));
    note += line('Reason for Cancellation', val('cp-reason'));
    if (val('cp-reason') === 'Other') note += line('Reason Details', val('cp-otherReasonText'));
    if (val('cp-reason') === 'Price') {
      if (checked('cp-lostToMarket')) note += line('Lost to Market', val('cp-lostToMarketNameText'));
      if (checked('cp-savingsPercentage')) note += line('Savings Percentage', val('cp-savingsPercentageText'));
    }
    note += line('Open to Staying', radio('cp-openStaying'));
    if (radio('cp-openStaying') === 'Yes') {
      note += line('Did We Quote', radio('cp-didWeQuoteRadio'));
      if (radio('cp-didWeQuoteRadio') === 'No') note += line('Why Not Quoted', val('cp-didWeQuoteWhyText'));
    }
    note += line('Permission to Call Back', radio('cp-permissionCallback'));
    if (radio('cp-permissionCallback') === 'Yes') note += line('Callback Contact', val('cp-callbackContactText'));
    note += line('Existing Policy Notes', val('cp-existingPolicyNotes'));
    const cpConsiderations = [];
    if (checked('cp-discussMultiline')) cpConsiderations.push('Discussed impact on multi-line discounts');
    if (checked('cp-reviewClaims')) cpConsiderations.push('Reviewed outstanding claims/payments');
    if (checked('cp-adviseFees')) cpConsiderations.push('Advised of potential cancellation fees/insurer rules');
    if (checked('cp-provideNextSteps')) cpConsiderations.push('Provided next steps and timelines');
    if (cpConsiderations.length) note += `Additional Considerations:\n${cpConsiderations.map(c => `  - ${c}`).join('\n')}\n`;
    const cpConfirmations = [];
    if (checked('cp-confirmProceed')) cpConfirmations.push('Client confirmed they still wish to proceed');
    if (checked('cp-processCancellation')) cpConfirmations.push('Cancellation processed (LPV obtained, normal procedures followed)');
    if (checked('cp-provideConfirmation')) cpConfirmations.push('Provided confirmation and timeline');
    if (checked('cp-thankClient')) cpConfirmations.push('Thanked client professionally');
    if (cpConfirmations.length) note += `Final Confirmation:\n${cpConfirmations.map(c => `  - ${c}`).join('\n')}\n`;
    note += line('Additional Notes', val('cp-additionalNotes'));
    note += `\nNote generated: ${ts}`;
  }

  else if (sectionId === 'AutoAmendCoverage') {
    note = `AMEND COVERAGE – AUTO\n${'─'.repeat(40)}\n`;
    note += line('Contacted By', val('amc-contactedBy'));
    note += line('Time', val('amc-contactedTime'));
    note += line('Effective Date', val('amc-effectiveDate'));
    note += line('Vehicle', val('amc-vehicle'));
    note += line('Vehicle Leased', radio('amc-leased'));
    note += line('Coverage Change Details', val('amc-details'));
    note += line('Reason for Change', val('amc-reason'));
    note += line('Additional Notes', val('amc-additionalNotes'));
    note += `\nNote generated: ${ts}`;
  }

  else if (sectionId === 'AddressChange') {
    note = `ADDRESS CHANGE\n${'─'.repeat(40)}\n`;
    note += line('Contacted By', val('ac-contactedBy'));
    note += line('Time', val('ac-contactedTime'));
    note += line('Effective Date', val('ac-effectiveDate'));
    note += line('New Address', val('ac-newAddress'));
    note += line('Affects Usage/Commute', radio('ac-usage'));
    if (radio('ac-usage') === 'Yes') note += line('Usage Change Details', val('ac-usageDetails'));
    note += line('New Drivers in Household', radio('ac-newdrivers'));
    // Collect driver rows
    const rows = document.querySelectorAll('#ac-driversTable .dynamic-row');
    if (rows.length > 0 && radio('ac-newdrivers') === 'Yes') {
      note += 'New Drivers Info:\n';
      rows.forEach(r => {
        const inputs = r.querySelectorAll('input');
        if (inputs[0].value) note += `  - ${inputs[0].value} | ${inputs[1].value} | ${inputs[2].value}\n`;
      });
    }
    note += line('Affects Driver Assignment', radio('ac-driverassign'));
    if (radio('ac-driverassign') === 'Yes') note += line('Assignment Change Details', val('ac-driverAssignDetails'));
    note += line('Additional Notes', val('ac-additionalNotes'));
    note += `\nNote generated: ${ts}`;
  }

  else if (sectionId === 'NameChange') {
    note = `NAME CHANGE\n${'─'.repeat(40)}\n`;
    note += line('Contacted By', val('nc-contactedBy'));
    note += line('Time', val('nc-contactedTime'));
    note += line('Effective Date', val('nc-effectiveDate'));
    note += line('New Name', val('nc-newName'));
    note += line('Reason', val('nc-reason'));
    note += line('New DL Obtained', radio('nc-license'));
    if (radio('nc-license') === 'Yes') note += line('New License Number', val('nc-licenseNumber'));
    else if (radio('nc-license') === 'No') note += 'Action: Set abeyance to obtain copy of driver\'s license when obtained.\n';
    note += line('Additional Notes', val('nc-additionalNotes'));
    note += `\nNote generated: ${ts}`;
  }

else if (sectionId === 'SubstitutingVehicle') {
    note = `SUBSTITUTING A VEHICLE\n${'─'.repeat(40)}\n`;
    note += line('Contacted By', val('sv-contactedBy'));
    note += line('Time', val('sv-contactedTime'));
    note += line('Effective Date', val('sv-effectiveDate'));
    note += line('Vehicle Being Added', `${val('sv-addYear')} ${val('sv-addMake')} ${val('sv-addModel')} – VIN: ${val('sv-addVin')}`);
    note += line('Vehicle Being Removed', `${val('sv-remYear')} ${val('sv-remMake')} ${val('sv-remModel')}`);
    note += line('Registered Owner of Added Vehicle', val('sv-registeredOwner'));
    note += line('Financial Interest', radio('sv-financial'));
    note += line('Vehicle Condition', radio('sv-age'));
    note += line('Principal Operator', val('sv-principalOp'));
    note += line('Occasional Drivers', val('sv-occasionalDrv'));
    note += line('Vehicle Use', val('sv-use'));
    note += line('1-Way Commute', val('sv-commute'));
    note += line('Total Annual KM', val('sv-annualKm'));
    note += '\nCOVERAGE:\n';
    note += line('  Liability', val('sv-liability'));
    note += line('  All Perils Ded.', val('sv-allperils'));
    note += line('  Collision Ded.', val('sv-collision'));
    note += line('  Comprehensive Ded.', val('sv-comprehensive'));
    note += line('Additional Notes', val('sv-additionalNotes'));
    note += `\nNote generated: ${ts}`;
  }

  else if (sectionId === 'RemovingVehicle') {
    note = `REMOVING A VEHICLE\n${'─'.repeat(40)}\n`;
    note += line('Contacted By', val('rv-contactedBy'));
    note += line('Time', val('rv-contactedTime'));
    note += line('Effective Date', val('rv-effectiveDate'));
    note += line('Vehicle Being Removed', val('rv-vehicle'));
    note += line('Reason', val('rv-reason'));
    note += line('Affects Other Vehicles Usage', radio('rv-affectOther'));
    if (radio('rv-affectOther') === 'Yes') note += line('Usage Change Details', val('rv-affectOtherDetails'));
    note += line('Additional Notes', val('rv-additionalNotes'));
    note += `\nNote generated: ${ts}`;
  }

  else if (sectionId === 'RemovingVehicle') {
    note = `REMOVING A VEHICLE\n${'─'.repeat(40)}\n`;
    note += line('Contacted By', val('rv-contactedBy'));
    note += line('Time', val('rv-contactedTime'));
    note += line('Effective Date', val('rv-effectiveDate'));
    note += line('Vehicle Being Removed', val('rv-vehicle'));
    note += line('Reason', val('rv-reason'));
    note += line('Affects Other Vehicles Usage', radio('rv-affectOther'));
    if (radio('rv-affectOther') === 'Yes') note += line('Usage Change Details', val('rv-affectOtherDetails'));
    note += line('Additional Notes', val('rv-additionalNotes'));
    note += `\nNote generated: ${ts}`;
  }

  else if (sectionId === 'AddingDriver') {
    note = `ADDING A DRIVER\n${'─'.repeat(40)}\n`;
    note += line('Contacted By', val('ad-contactedBy'));
    note += line('Time', val('ad-contactedTime'));
    note += line('Effective Date', val('ad-effectiveDate'));
    note += line('Driver Name', val('ad-driverName'));
    note += line('License Number', val('ad-licenseNum'));
    note += line('Date of Birth', val('ad-dob'));
    note += line('Relationship to Insured', val('ad-relationship'));
    note += line('Marital Status', radio('ad-marital'));
    if (['Married','Common-law'].includes(radio('ad-marital'))) {
      note += line('Spouse Has Own Insurance', radio('ad-spouseInsurance'));
      if (radio('ad-spouseInsurance') === 'Yes') {
        note += line('Spouse Name', val('ad-spouseName'));
        note += line('Spouse Carrier', val('ad-spouseCarrier'));
        note += line('Spouse Policy #', val('ad-spousePolicyNum'));
      }
    }
    note += line('G1 Date', val('ad-g1'));
    note += line('G2 Date', val('ad-g2'));
    note += line('G Date', val('ad-g'));
    note += 'ACTION: Ensure DL History is on file.\n';
    note += line('Driver Education Completed', radio('ad-education'));
    note += line('Heavy Vehicles on Policy', radio('ad-heavyOnPolicy'));
    if (radio('ad-heavyOnPolicy') === 'Yes') {
      note += line('Driver License Class', val('ad-licenseClass'));
      note += line("Minimum 3 Years' Experience (LOE Required)", radio('ad-3yrExp'));
    }
    note += line('New Heavy Vehicles Being Added', radio('ad-newHeavyVehicles'));
    if (radio('ad-newHeavyVehicles') === 'Yes') {
      note += line('All Drivers Meet License Class Requirements', radio('ad-meetLicenseReq'));
      note += line("3 Years' Experience Confirmed (LOE)", radio('ad-heavy3yrExp'));
      note += line('CVOR Number', val('ad-cvorNewHeavy'));
    }
    note += line('Reason for Addition', val('ad-reason'));
    note += line('MVR and Autoplus Pulled', radio('ad-mvr'));
    note += line('Affects Usage on Other Vehicles', radio('ad-affectUsage'));
    if (radio('ad-affectUsage') === 'Yes') note += line('Usage Change Details', val('ad-usageDetails'));
    note += line('Additional Notes', val('ad-additionalNotes'));
    note += `\nNote generated: ${ts}`;
  }

  else if (sectionId === 'RemovingDriver') {
    note = `REMOVING A DRIVER\n${'─'.repeat(40)}\n`;
    note += line('Contacted By', val('rd-contactedBy'));
    note += line('Time', val('rd-contactedTime'));
    note += line('Effective Date', val('rd-effectiveDate'));
    note += line('Driver Being Removed', val('rd-driverName'));
    note += line('Reason', val('rd-reason'));
    note += line('Will Remain in Household', radio('rd-remain'));
    if (radio('rd-remain') === 'Yes') {
      note += line('Has Own Insurance', radio('rd-ownInsurance'));
      if (radio('rd-ownInsurance') === 'Yes') {
        note += line('Insurance Carrier', val('rd-insuranceCarrier'));
        note += line('Policy Number', val('rd-policyNum'));
      }
    }
    note += line('Affects Other Vehicles Usage', radio('rd-affectUsage'));
    if (radio('rd-affectUsage') === 'Yes') note += line('Usage Change Details', val('rd-usageDetails'));
    note += line('Additional Notes', val('rd-additionalNotes'));
    note += `\nNote generated: ${ts}`;
  }

  else if (sectionId === 'InterestedParty') {
    note = `ADD / REMOVE / AMEND INTERESTED PARTY – AUTO\n${'─'.repeat(40)}\n`;
    note += line('Contacted By', val('ip-contactedBy'));
    note += line('Time', val('ip-contactedTime'));
    note += line('Effective Date', val('ip-effectiveDate'));
    note += line('Type of Change', radio('ip-type'));
    note += line('Financial Interest Type', radio('ip-fintype'));
    note += line('Financial Interest Details', val('ip-finAddress'));
    note += line('Removal Details', val('ip-removalDetails'));
    note += line('Additional Notes', val('ip-additionalNotes'));
    note += `\nNote generated: ${ts}`;
  }


  else if (sectionId === 'AmendRating') {
    note = `AMEND RATING OR LICENSE CLASS\n${'─'.repeat(40)}\n`;
    note += line('Contacted By', val('ar-contactedBy'));
    note += line('Time', val('ar-contactedTime'));
    note += line('Effective Date', val('ar-effectiveDate'));
    note += line('Amendment Type', radio('ar-amendType'));
    note += line('Rating/KM Change', val('ar-rating'));
    note += line('License Class Change', val('ar-licenseClass'));
    note += line('Additional Notes', val('ar-additionalNotes'));
    note += `\nNote generated: ${ts}`;
  }

  else if (sectionId === 'AddingDiscountAuto') {
    note = `ADDING DISCOUNT – AUTO\n${'─'.repeat(40)}\n`;
    note += line('Contacted By', val('da-contactedBy'));
    note += line('Time', val('da-contactedTime'));
    note += line('Action', radio('da-switch'));
    const discounts = [];
    if (checked('da-multiline')) discounts.push(`Multiline (Policy: ${val('da-multilinePolicyNum')}) – ${val('da-multilineDetails')}`);
    if (checked('da-winter')) discounts.push(`Winter Tire – ${val('da-winterDetails')}`);
    if (checked('da-retiree')) discounts.push(`Retiree – ${val('da-retireeDetails')}`);
    if (checked('da-multiveh')) discounts.push(`Multi-Vehicle (Policy: ${val('da-multivehPolicyNum')}) – ${val('da-multivehDetails')}`);
    if (discounts.length) note += `Discounts:\n${discounts.map(d => `  - ${d}`).join('\n')}\n`;
    note += line('Additional Notes', val('da-additionalNotes'));
    note += `\nNote generated: ${ts}`;
  }

  else if (sectionId === 'AddingNamedInsured') {
    note = `ADDING A NAMED INSURED\n${'─'.repeat(40)}\n`;
    note += line('Contacted By', val('ani-contactedBy'));
    note += line('Time', val('ani-contactedTime'));
    note += line('Effective Date', val('ani-effectiveDate'));
    note += line('Full Legal Name', val('ani-fullName'));
    note += line('Current Address', val('ani-currentAddress'));
    note += line('Type of Addition', radio('ani-type'));
    note += line('Date of Birth', val('ani-dob'));
    note += line('Occupation', val('ani-occupation'));
    note += line('Relationship to Named Insured', val('ani-relationship'));
    note += line('Insurance Carrier', val('ani-carrier'));
    note += line('Policy Number', val('ani-policyNum'));
    note += line('Interest', val('ani-interest'));
    note += line('Reason for Addition', val('ani-reason'));
    note += line('Additional Notes', val('ani-additionalNotes'));
    note += `\nNote generated: ${ts}`;
  }

  else if (sectionId === 'AddingNamedInsuredAuto') {
    note = `ADDING A NAMED INSURED – AUTO\n${'─'.repeat(40)}\n`;
    note += line('Contacted By', val('ania-contactedBy'));
    note += line('Time', val('ania-contactedTime'));
    note += line('Effective Date', val('ania-effectiveDate'));
    note += line('Full Legal Name', val('ania-fullName'));
    note += line('Current Address', val('ania-currentAddress'));
    note += line('Type of Addition', radio('ania-type'));
    note += line('Date of Birth', val('ania-dob'));
    note += line('Occupation', val('ania-occupation'));
    note += line('Relationship to Named Insured', val('ania-relationship'));
    note += line('Insurance Carrier', val('ania-carrier'));
    note += line('Policy Number', val('ania-policyNum'));
    note += line('Interest', val('ania-interest'));
    note += line('Reason for Addition', val('ania-reason'));
    note += line('Additional Notes', val('ania-additionalNotes'));
    note += `\nNote generated: ${ts}`;
  }

  else if (sectionId === 'HomeownersLocation') {
    note = `ADDING OR SUBBING A LOCATION – HOMEOWNERS\n${'─'.repeat(40)}\n`;
    note += line('Contacted By', val('hl-contactedBy'));
    note += line('Time', val('hl-contactedTime'));
    note += line('Change Type', radio('hl-changetype'));
    if (val('hl-removedAddress')) note += line('Address Removed', val('hl-removedAddress') + ' (eff. ' + val('hl-deletionDate') + ')');
    note += line('New Address Added', val('hl-newAddress') + (val('hl-additionDate') ? ' (eff. ' + val('hl-additionDate') + ')' : ''));
    note += line('Replacement Cost', val('hl-replacementCost'));
    note += line('Year Built', val('hl-yearBuilt'));
    note += line('Names on Deed', val('hl-deedNames'));
    note += line('Mortgage on Property', radio('hl-mortgage'));
    if (radio('hl-mortgage') === 'Yes') {
      note += line('Mortgage Type', radio('hl-mortgagetype'));
      note += line('Mortgagee', val('hl-mortgageeAddress'));
    }
    note += '\nBUILDING DETAILS:\n';
    note += line('  Construction', val('hl-construction'));
    note += line('  Exterior Finish', val('hl-exterior'));
    note += line('  Structure Type', val('hl-structure'));
    note += line('  Garage', val('hl-garage'));
    note += line('  Storeys', val('hl-storeys'));
    note += line('  Electrical', val('hl-electrical'));
    note += line('  Plumbing', val('hl-plumbing'));
    note += line('  Roofing', val('hl-roofing'));
    note += line('  Heating', val('hl-heating'));
    note += line('  Auxiliary Heating', val('hl-auxHeating'));
    note += line('  Hydrant Distance', val('hl-hydrant'));
    note += line('  Fire Hall Distance', val('hl-firehall'));
    const exposures = [];
    if (checked('hl-pool')) exposures.push('Swimming Pool');
    if (checked('hl-dogs')) exposures.push('Dogs');
    if (checked('hl-homebiz')) exposures.push('Home Based Business');
    if (checked('hl-adjbiz')) exposures.push('Adjacent Business');
    if (checked('hl-tenants')) exposures.push('Tenants/Boarders/Airbnb');
    if (checked('hl-renos')) exposures.push('Planned Renovations/Vacancy');
    if (exposures.length) note += `Liability Exposures: ${exposures.join(', ')}\n`;
    note += line('Exposure Details', val('hl-exposureDetails'));
    note += line('Liability Limit', val('hl-liabilityLimit'));
    note += line('Deductible', val('hl-deductible'));
    note += line('Sewer Backup', val('hl-sewerBackup'));
    note += line('Overland Water', val('hl-overlandWater'));
    note += line('Additional Notes', val('hl-additionalNotes'));
    note += `\nNote generated: ${ts}`;
  }

  else if (sectionId === 'CondoLocation') {
    note = `ADDING OR SUBBING A LOCATION – RENTAL\n${'─'.repeat(40)}\n`;
    note += line('Contacted By', val('cl-contactedBy'));
    note += line('Time', val('cl-contactedTime'));
    if (val('cl-removedAddress')) note += line('Address Removed', val('cl-removedAddress') + ' (eff. ' + val('cl-deletionDate') + ')');
    note += line('New Address Added', val('cl-newAddress') + (val('cl-additionDate') ? ' (eff. ' + val('cl-additionDate') + ')' : ''));
    note += line('Improvements & Betterments Limit', val('cl-improvementsLimit'));
    note += line('Contents Limit', val('cl-contentsLimit'));
    note += line('Purchase Price', val('cl-replacementCost'));
    note += line('Year Built', val('cl-yearBuilt'));
    note += line('Names on Deed', val('cl-deedNames'));
    note += line('Liability Limit', val('cl-liabilityLimit'));
    note += line('Deductible', val('cl-deductible'));
    note += line('Sewer Backup', val('cl-sewerBackup'));
    note += line('Additional Notes', val('cl-additionalNotes'));
    note += `\nNote generated: ${ts}`;
  }

  else if (sectionId === 'RemovingLocation') {
    note = `REMOVING A LOCATION\n${'─'.repeat(40)}\n`;
    note += line('Contacted By', val('rl-contactedBy'));
    note += line('Time', val('rl-contactedTime'));
    note += line('Effective Date', val('rl-effectiveDate'));
    note += line('Risk Being Deleted', val('rl-details'));
    note += line('Reason for Deletion', val('rl-reason'));
    note += line('Additional Notes', val('rl-additionalNotes'));
    note += `\nNote generated: ${ts}`;
  }

  else if (sectionId === 'CoverageChange') {
    note = `AMEND COVERAGE – PROPERTY\n${'─'.repeat(40)}\n`;
    note += line('Contacted By', val('cc-contactedBy'));
    note += line('Time', val('cc-contactedTime'));
    note += line('Effective Date', val('cc-effectiveDate'));
    note += line('Location(s)', val('cc-locations'));
    note += line('Coverage Change Requested', val('cc-details'));
    note += line('Reason for Change', val('cc-reason'));
    note += line('Additional Notes', val('cc-additionalNotes'));
    note += `\nNote generated: ${ts}`;
  }

  else if (sectionId === 'InterestedPartyProperty') {
    note = `ADD / REMOVE / AMEND MORTGAGEE\n${'─'.repeat(40)}\n`;
    note += line('Contacted By', val('ipp-contactedBy'));
    note += line('Time', val('ipp-contactedTime'));
    note += line('Effective Date', val('ipp-effectiveDate'));
    note += line('Type of Change', radio('ipp-type'));
    note += line('Mortgagee Type', radio('ipp-mortgtype'));
    note += line('Mortgagee Details', val('ipp-mortgAddress'));
    note += line('Additional Notes', val('ipp-additionalNotes'));
    note += `\nNote generated: ${ts}`;
  }

  else if (sectionId === 'AddingDiscountProperty') {
    note = `ADDING DISCOUNT – PROPERTY\n${'─'.repeat(40)}\n`;
    note += line('Contacted By', val('dp-contactedBy'));
    note += line('Time', val('dp-contactedTime'));
    note += line('Action', radio('dp-switch'));
    const discounts = [];
    if (checked('dp-multiline')) discounts.push(`Multiline (Policy: ${val('dp-multilinePolicyNum')}) – ${val('dp-multilineDetails')}`);
    if (checked('dp-nonsmoker')) discounts.push(`Non-Smoker – ${val('dp-nonsmokerDetails')}`);
    if (checked('dp-retiree')) discounts.push(`Retiree – ${val('dp-retireeDetails')}`);
    if (checked('dp-water')) discounts.push(`Water Mitigation – Sump: ${val('dp-sumpPump')}, Alarmed: ${val('dp-alarmedSump')}, Type: ${val('dp-waterType')}`);
    if (checked('dp-alarmBurglar')) discounts.push(`Monitored Alarm (Burglar) – Type: ${val('dp-alarmBurglarType')}`);
    if (checked('dp-alarmFire')) discounts.push(`Monitored Alarm (Fire) – Type: ${val('dp-alarmFireType')}`);
    if (discounts.length) note += `Discounts:\n${discounts.map(d => `  - ${d}`).join('\n')}\n`;
    note += line('Additional Notes', val('dp-additionalNotes'));
    note += `\nNote generated: ${ts}`;
  }

  else if (sectionId === 'PropertyRenewal') {
    const prUnconfirmed = [];
    note = `PROPERTY RENEWAL\n${'─'.repeat(40)}\n`;
    note += line('Property Changes/New Properties Added', radio('pr-propertyChanges'));
    if (radio('pr-propertyChanges') === 'Yes') note += 'Action: Complete/update all COPE details.\n';
    note += line('Building Coverage Required', radio('pr-buildingCoverageReq'));
    if (radio('pr-buildingCoverageReq') === 'Yes') {
      note += line('Building Limit', val('pr-buildingLimit'));
      note += line('ITV Completed', radio('pr-itvCompleted'));
      note += line('MSB Valuation Completed', radio('pr-msbCompleted'));
    }
    note += line('Coverage Limits Accurate and Up to Date', radio('pr-limitsAccurate'));
    if (radio('pr-limitsAccurate') === 'No') {
      note += 'Review and Update:\n';
      note += line('  Building Limit', val('pr-buildingLimitUpdated'));
      note += line('  Contents Limit', val('pr-contentsLimitUpdated'));
      note += line('  Additional Limits', val('pr-additionalLimitsUpdated'));
    }
    note += line('Additional Coverages Required', radio('pr-additionalCoverageReq'));
    if (radio('pr-additionalCoverageReq') === 'Yes') {
      const addCov = [];
      if (checked('pr-cov-eo')) addCov.push('E&O');
      if (checked('pr-cov-pollution')) addCov.push('Pollution');
      if (checked('pr-cov-garage')) addCov.push('Garage policy');
      if (checked('pr-cov-other')) addCov.push('Other');
      if (addCov.length) note += `Additional Coverages: ${addCov.join(', ')}\n`;
      note += line('Other Coverage Details', val('pr-covOtherDetails'));
    }
    note += line('Revenues Confirmed', radio('pr-revenuesConfirmed'));
    if (radio('pr-revenuesConfirmed') === 'No') {
      note += line('Total Revenue', val('pr-totalRevenue'));
      note += line('Revenue Breakdown by Operation', val('pr-revenueBreakdown'));
      note += line('Liquor Exposure', radio('pr-liquorExposure'));
      if (radio('pr-liquorExposure') === 'Yes') note += line('Liquor-Related Revenue', val('pr-liquorRevenue'));
    }
    note += line('U.S. Operations or Revenue', radio('pr-usOpsRevenue'));
    if (radio('pr-usOpsRevenue') === 'Yes') note += line('U.S. Operations/Revenue Details', val('pr-usOpsRevenueDetails'));
    note += line('Client Uses Subcontractors', radio('pr-useSubcontractors'));
    if (radio('pr-useSubcontractors') === 'Yes') note += line('COIs Obtained', radio('pr-coiObtained'));

    note += '\nRENEWAL CHECKLIST DETAILS:\n';
    note += line('Client', val('pr-clientName'));
    note += line('Policy Number(s)', val('pr-policyNumbers'));
    note += line('Property Type', val('pr-policyType'));
    note += line('Date of Review', val('pr-reviewDate'));
    note += line('Account Manager', val('pr-accountManager'));
    note += line('Renewal Percentage Increase', val('pr-percentageIncrease'));

    if (checked('pr-verifyInsured')) note += 'All named insureds: Verified\n'; else prUnconfirmed.push('All named insureds');
    if (checked('pr-confirmMailing')) note += 'Mailing address: Confirmed\n'; else prUnconfirmed.push('Mailing address');
    if (checked('pr-confirmDwelling')) note += 'Risk/dwelling address(es): Confirmed\n'; else prUnconfirmed.push('Risk/dwelling address(es)');
    if (checked('pr-roof')) note += 'Roof: Verified\n'; else prUnconfirmed.push('Roof verification');
    if (checked('pr-electrical')) note += 'Electrical system: Verified\n'; else prUnconfirmed.push('Electrical system');
    if (checked('pr-plumbing')) note += 'Plumbing system: Verified\n'; else prUnconfirmed.push('Plumbing system');
    if (checked('pr-heating')) note += 'Heating system: Verified\n'; else prUnconfirmed.push('Heating system');
    if (checked('pr-waterMitigation')) note += 'Water mitigation systems: Verified\n'; else prUnconfirmed.push('Water mitigation systems');
    if (checked('pr-otherUpdates')) note += 'Other updates impacting premiums: Reviewed\n'; else prUnconfirmed.push('Other updates');
    if (checked('pr-noBusinessHome')) note += 'No business operations in home: Confirmed\n'; else prUnconfirmed.push('No business operations in home');
    if (checked('pr-noRenovations')) note += 'No major renovations: Confirmed\n'; else prUnconfirmed.push('No major renovations');
    if (checked('pr-remindContact')) note += 'Client reminded to contact BIG for updates: Yes\n'; else prUnconfirmed.push('Client reminder');
    if (checked('pr-dwellingCoverage')) note += 'Dwelling/building coverage explained: Yes\n'; else prUnconfirmed.push('Dwelling/building coverage explanation');
    if (checked('pr-personalProperty')) note += 'Personal property reviewed: Yes\n'; else prUnconfirmed.push('Personal property review');
    if (checked('pr-liabilityIncrease')) note += 'Liability increase (2M/Umbrella) offered: Yes\n';
    if (checked('pr-otherCoverages')) note += 'Other applicable coverages reviewed: Yes\n';

    note += line('Detached Structures Coverage Sufficient', val('pr-detachedStructures'));
    note += line('Additional Living Expenses Discussed', val('pr-livingExpenses'));
    note += line('Reviewed Current Water Damage Coverages', val('pr-reviewedWater'));
    note += line('Identified Missing Water Coverages', val('pr-identifiedMissingWater'));
    note += line('Sewer Backup', val('pr-sewerBackup'));
    note += line('Overland Water', val('pr-overlandWater'));
    note += line('Ground Water', val('pr-groundWater'));

    if (checked('pr-coverageIncreases')) note += 'Coverage increases reviewed/offered: Yes\n';
    if (checked('pr-optionalCoverages')) note += 'Optional/additional coverages offered: Yes\n';
    if (checked('pr-advisedPremiumImpact')) note += 'Premium impact advised: Yes\n';
    if (checked('pr-smokeFree')) note += 'Smoke-free discount reviewed: Yes\n';
    if (checked('pr-waterMitigationDiscount')) note += 'Water mitigation discount reviewed: Yes\n';
    if (checked('pr-mortgageFree')) note += 'Mortgage-free discount reviewed: Yes\n';
    if (checked('pr-otherDiscounts')) note += 'Other discounts reviewed: Yes\n';
    if (checked('pr-shopPolicy')) note += 'Policy shopped for 15%+ increase: Yes\n';
    if (checked('pr-didNotShop')) {
      note += 'Policy NOT shopped: Yes\n';
      note += line('Reason Not Shopped', val('pr-shopReason'));
    }
    note += line('Monoline', radio('pr-monoline'));
    if (radio('pr-monoline') === 'Yes') {
      note += line('Interested in Another Line Quote', radio('pr-monolineInterested'));
      if (radio('pr-monolineInterested') === 'Yes') note += line('Offered', val('pr-monolineOffered'));
    }
    note += line('Additional Review Notes', val('pr-additionalReviewNotes'));

    if (prUnconfirmed.length) {
      note += '\nUNCONFIRMED ITEMS:\n';
      prUnconfirmed.forEach(item => { note += `  - ${item}\n`; });
    }
    note += `\nNote generated: ${ts}`;
  }

  else if (sectionId === 'PaymentMethodChange') {
    note = `PAYMENT METHOD CHANGE\n${'─'.repeat(40)}\n`;
    note += line('Effective Date', val('pmc-effectiveDate'));
    note += line('Payment Method', radio('pmc-method'));
    note += line('Details', val('pmc-details'));
    note += `\nNote generated: ${ts}`;
  }

  else if (sectionId === 'ChangePaymentPlan') {
    note = `CHANGE PAYMENT PLAN\n${'─'.repeat(40)}\n`;
    note += line('Effective Date', val('cpp-effectiveDate'));
    note += line('Change Plan To', val('cpp-changePlan'));
    note += line('Withdrawal Date', val('cpp-withdrawalDate'));
    note += line('Reason', val('cpp-reason'));
    note += `\nNote generated: ${ts}`;
  }

  else if (sectionId === 'RefundInquiry') {
    note = `REFUND INQUIRY\n${'─'.repeat(40)}\n`;
    note += line('Requested Refund Amount', val('ri-amount'));
    note += line('Reason', val('ri-reason'));
    note += line('Notes', val('ri-notes'));
    note += `\nNote generated: ${ts}`;
  }

  else if (sectionId === 'MakePayment') {
    note = `MAKE A PAYMENT\n${'─'.repeat(40)}\n`;
    note += line('Payment Amount', val('mp-amount'));
    note += line('Payment Due Date', val('mp-date'));
    note += line('Payment Method', radio('mp-method'));
    note += line('Notes', val('mp-notes'));
    note += `\nNote generated: ${ts}`;
  }

  else if (sectionId === 'BillingOther') {
    note = `BILLING - OTHER\n${'─'.repeat(40)}\n`;
    note += line('Details', val('bo-details'));
    note += `\nNote generated: ${ts}`;
  }

  const finalNote = note.trim();
  if (showOutput && finalNote) showNote(sectionId, finalNote);
  return finalNote;
}

// Ordered list of every form section id used by generateAllNotes() / sectionHasData().
function getAllSectionIds() {
  return [
    'GeneralNote','CancelPolicy','AutoAmendCoverage','AddressChange','NameChange','AddingVehicle','SubstitutingVehicle',
    'RemovingVehicle','AddingDriver','RemovingDriver','InterestedParty','AmendRating',
    'AddingDiscountAuto','AddingNamedInsuredAuto','AddingNamedInsured','HomeownersLocation','CondoLocation',
    'RemovingLocation','CoverageChange','InterestedPartyProperty','AddingDiscountProperty','PropertyRenewal',
    'PaymentMethodChange','ChangePaymentPlan','RefundInquiry','MakePayment','BillingOther'
  ];
}

// Drag-to-resize handler for the left sidebar (pointer events, min/max width clamp).
function initSidebarResize() {
  const sidebar = document.querySelector('.sidebar');
  const resizer = document.getElementById('sidebar-resizer');
  if (!sidebar || !resizer) return;

  let startX = 0;
  let startW = 0;
  let dragging = false;
  const minW = 220;
  const maxW = 520;

  resizer.addEventListener('pointerdown', (e) => {
    dragging = true;
    startX = e.clientX;
    startW = sidebar.getBoundingClientRect().width;
    resizer.setPointerCapture(e.pointerId);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  });

  resizer.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const next = Math.min(maxW, Math.max(minW, startW + (e.clientX - startX)));
    sidebar.style.width = `${next}px`;
  });

  function stopDrag() {
    dragging = false;
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  }

  resizer.addEventListener('pointerup', stopDrag);
  resizer.addEventListener('pointercancel', stopDrag);
}

// Hover/click expand-collapse for the bottom floating Generate Notes panel (auto-hide timer).
function initFloatingNotesPanel() {
  const panel = document.getElementById('floating-notes-panel');
  const tab = document.getElementById('notes-tab');
  if (!panel || !tab) return;

  const HIDE_DELAY = 5000;
  let hideTimer = null;

  function expand() {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    panel.classList.add('expanded');
    tab.classList.add('expanded');
  }

  function collapse() {
    panel.classList.remove('expanded');
    tab.classList.remove('expanded');
  }

  function scheduleCollapse() {
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      collapse();
      hideTimer = null;
    }, HIDE_DELAY);
  }

  [tab, panel].forEach(el => {
    el.addEventListener('mouseenter', expand);
    el.addEventListener('mouseleave', scheduleCollapse);
  });

  tab.addEventListener('click', () => {
    if (panel.classList.contains('expanded')) {
      collapse();
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
    } else {
      expand();
    }
  });
}

// Returns true if any input/textarea/select in the section has a meaningful value (for bulk gen).
function sectionHasData(sectionId) {
  const sec = document.getElementById('sec-' + sectionId);
  if (!sec) return false;
  if (!sec.classList.contains('visible')) return false;
  const fields = sec.querySelectorAll('input, textarea, select');
  for (const el of fields) {
    if ((el.type === 'checkbox' || el.type === 'radio') && el.checked) return true;
    if (el.tagName === 'SELECT' && el.value) return true;
    if ((el.type === 'text' || el.tagName === 'TEXTAREA') && (el.value || '').trim()) return true;
  }
  return false;
}

// Bulk generator: global contact sentence + every section with data, stripped of per-section
// contact/time lines, joined into the floating panel output textarea.
function generateAllNotes() {
  const chunks = [];
  const contactDirection = radio('global-direction');
  const contactMethod = radio('global-method');
  const globalContactBy = val('global-contactedBy');
  const globalContactWhen = val('global-contactedTime');
  const globalContactSentence = buildGlobalContactSentence();
  if (globalContactBy || globalContactWhen || contactDirection || contactMethod) {
    if (globalContactSentence) chunks.push(globalContactSentence);
    else {
      const parts = [];
      if (globalContactBy) parts.push(globalContactBy);
      if (globalContactWhen) parts.push(globalContactWhen);
      if (parts.length) chunks.push(parts.join(' at '));
    }
  }
  for (const sectionId of getAllSectionIds()) {
    if (!sectionHasData(sectionId)) continue;
    const note = generateNote(sectionId, false);
    if (!note) continue;
    const noteLines = note.split('\n');
    const title = (noteLines[0] || '').trim();
    const withoutHeader = noteLines[1] && /^[-─]{10,}$/.test(noteLines[1].trim())
      ? noteLines.slice(2)
      : noteLines;
    const cleaned = withoutHeader
      .filter(line =>
        !line.startsWith('Contacted By:') &&
        !line.startsWith('Called/Emailed by:') &&
        !line.startsWith('Time:') &&
        !line.startsWith('Note generated:')
      )
      .join('\n')
      .trim();
    if (!cleaned) continue;
    chunks.push(title ? `**${title}**\n${cleaned}` : cleaned);
  }
  const out = document.getElementById('all-notes-output');
  out.value = chunks.join('\n\n');
  const results = document.getElementById('floating-notes-results');
  if (results) results.classList.add('visible');
}

// Builds the leading "inbound call from X at Y" sentence from global contact radios/fields.
function buildGlobalContactSentence() {
  const direction = radio('global-direction');
  const method = radio('global-method');
  const who = val('global-contactedBy');
  const when = val('global-contactedTime');
  if (!direction || !method) return '';
  const dirWord = direction.toLowerCase();
  const methodWord = method.toLowerCase();
  const prep = direction === 'Inbound' ? 'from' : 'to';
  let sentence = `${dirWord} ${methodWord} ${prep}`;
  if (who) sentence += ` ${who}`;
  if (when) sentence += ` at ${when}`;
  return sentence;
}

// Placeholder for a live preview of the global contact sentence (currently no-op).
function updateGlobalContactPreview() {
  // Preview hidden intentionally.
}

// Copies the combined notes textarea to the clipboard (with execCommand fallback).
function copyAllNotes() {
  const out = document.getElementById('all-notes-output');
  if (!out || !out.value.trim()) return;
  navigator.clipboard.writeText(out.value).catch(() => {
    out.select();
    document.execCommand('copy');
  });
}

// Open/close the appearance settings modal (color scheme, bg style, font, size).
function toggleSettingsMenu() {
  const menu = document.getElementById('settings-menu');
  const overlay = document.getElementById('settings-overlay');
  if (!menu || !overlay) return;
  const open = !menu.classList.contains('open');
  menu.classList.toggle('open', open);
  overlay.classList.toggle('open', open);
}

// Force-close the appearance settings modal and overlay.
function closeSettingsMenu() {
  const menu = document.getElementById('settings-menu');
  const overlay = document.getElementById('settings-overlay');
  if (menu) menu.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
}

// ===== APPEARANCE / THEMING DATA =====
// Ten full color schemes (light + dark) and five main-content background patterns.
// Applied via CSS variables on :root; persisted in localStorage.
const colorSchemes = {
  scheme1: {
    pageBg: '#f8f9fb',
    formBg: '#ffffff',
    fontColor: '#1a2035',
    labelColor: '#3d4558',
    sidebarBg: '#ffffff',
    settingsBg: '#ffffff',
    headerBg: '#0f2040',
    headerText: '#ffffff',
    subtitleText: 'rgba(255,255,255,0.65)',
    logoBg: '#e8a020',
    logoText: '#0f2040',
    btnPrimaryBg: '#1e5fa8',
    btnPrimaryHover: '#0f2040',
    btnPrimaryText: '#ffffff',
    btnSecondaryBg: '#f0f2f6',
    btnSecondaryText: '#1a2035',
    inputBg: 'transparent',
    inputLine: '#c8cfda',
    inputFocus: '#2e7dd4',
    accent: '#1e5fa8',
    accentSoft: '#eaf2fd'
  },
  scheme2: {
    pageBg: '#f5f8f4',
    formBg: '#ffffff',
    fontColor: '#1b2b22',
    labelColor: '#355241',
    sidebarBg: '#f8fbf7',
    settingsBg: '#ffffff',
    headerBg: '#1f4a38',
    headerText: '#f7fffb',
    subtitleText: 'rgba(240,255,248,0.72)',
    logoBg: '#b8d37a',
    logoText: '#1f4a38',
    btnPrimaryBg: '#2f7d5d',
    btnPrimaryHover: '#1f5b43',
    btnPrimaryText: '#ffffff',
    btnSecondaryBg: '#e8f0eb',
    btnSecondaryText: '#1f4a38',
    inputBg: 'transparent',
    inputLine: '#b7cabf',
    inputFocus: '#2f7d5d',
    accent: '#2f7d5d',
    accentSoft: '#e5f3ec'
  },
  scheme3: {
    pageBg: '#fffaf4',
    formBg: '#ffffff',
    fontColor: '#2f251d',
    labelColor: '#5a4736',
    sidebarBg: '#fffdf9',
    settingsBg: '#ffffff',
    headerBg: '#6a3f26',
    headerText: '#fff8f2',
    subtitleText: 'rgba(255,243,232,0.72)',
    logoBg: '#f2c078',
    logoText: '#5a341e',
    btnPrimaryBg: '#a75d2c',
    btnPrimaryHover: '#874a22',
    btnPrimaryText: '#ffffff',
    btnSecondaryBg: '#f7ede2',
    btnSecondaryText: '#5a341e',
    inputBg: 'transparent',
    inputLine: '#d8bfa9',
    inputFocus: '#a75d2c',
    accent: '#a75d2c',
    accentSoft: '#fceee2'
  },
  scheme4: {
    pageBg: '#f5f7fb',
    formBg: '#ffffff',
    fontColor: '#22283d',
    labelColor: '#434c6b',
    sidebarBg: '#f9faff',
    settingsBg: '#ffffff',
    headerBg: '#323b66',
    headerText: '#f7f8ff',
    subtitleText: 'rgba(230,235,255,0.75)',
    logoBg: '#9bb3ff',
    logoText: '#26305c',
    btnPrimaryBg: '#4b5fcc',
    btnPrimaryHover: '#3a4cab',
    btnPrimaryText: '#ffffff',
    btnSecondaryBg: '#eaedfb',
    btnSecondaryText: '#2a3566',
    inputBg: 'transparent',
    inputLine: '#b8c1e6',
    inputFocus: '#4b5fcc',
    accent: '#4b5fcc',
    accentSoft: '#e8ecff'
  },
  scheme5: {
    pageBg: '#f2f4f7',
    formBg: '#ffffff',
    fontColor: '#202226',
    labelColor: '#4a4f57',
    sidebarBg: '#f8f9fb',
    settingsBg: '#ffffff',
    headerBg: '#2f343d',
    headerText: '#f8f9fb',
    subtitleText: 'rgba(236,240,246,0.72)',
    logoBg: '#cbd3df',
    logoText: '#2f343d',
    btnPrimaryBg: '#4a5568',
    btnPrimaryHover: '#3a434f',
    btnPrimaryText: '#ffffff',
    btnSecondaryBg: '#e8ebef',
    btnSecondaryText: '#2f343d',
    inputBg: 'transparent',
    inputLine: '#b8bec8',
    inputFocus: '#4a5568',
    accent: '#4a5568',
    accentSoft: '#e9edf3'
  },
  scheme6: {
    pageBg: '#11151d',
    formBg: '#1b2230',
    fontColor: '#e8edf7',
    labelColor: '#c1ccdf',
    sidebarBg: '#161d29',
    settingsBg: '#1b2230',
    headerBg: '#0c111a',
    headerText: '#edf2ff',
    subtitleText: 'rgba(214,224,244,0.72)',
    logoBg: '#4e6da8',
    logoText: '#eff4ff',
    btnPrimaryBg: '#4a79d9',
    btnPrimaryHover: '#3a62b3',
    btnPrimaryText: '#f7faff',
    btnSecondaryBg: '#2a3447',
    btnSecondaryText: '#e8edf7',
    inputBg: 'rgba(255,255,255,0.02)',
    inputLine: '#59729e',
    inputFocus: '#7da3ff',
    accent: '#7da3ff',
    accentSoft: '#263550'
  },
  scheme7: {
    pageBg: '#121816',
    formBg: '#1b2521',
    fontColor: '#e6f2ec',
    labelColor: '#c0d7ce',
    sidebarBg: '#16201c',
    settingsBg: '#1b2521',
    headerBg: '#0f1613',
    headerText: '#edf8f2',
    subtitleText: 'rgba(203,228,217,0.72)',
    logoBg: '#5f9f8b',
    logoText: '#f0fbf6',
    btnPrimaryBg: '#3f8a6f',
    btnPrimaryHover: '#2f6e58',
    btnPrimaryText: '#f2fbf8',
    btnSecondaryBg: '#2a3b34',
    btnSecondaryText: '#e6f2ec',
    inputBg: 'rgba(255,255,255,0.02)',
    inputLine: '#5c8475',
    inputFocus: '#6acba4',
    accent: '#6acba4',
    accentSoft: '#214237'
  },
  scheme8: {
    pageBg: '#1a1411',
    formBg: '#261c17',
    fontColor: '#f5e8dc',
    labelColor: '#e3c8b1',
    sidebarBg: '#201712',
    settingsBg: '#261c17',
    headerBg: '#150f0c',
    headerText: '#fff3ea',
    subtitleText: 'rgba(245,215,189,0.72)',
    logoBg: '#ba7f5f',
    logoText: '#fff0e4',
    btnPrimaryBg: '#c07345',
    btnPrimaryHover: '#9d5d36',
    btnPrimaryText: '#fff5ee',
    btnSecondaryBg: '#3a2b23',
    btnSecondaryText: '#f5e8dc',
    inputBg: 'rgba(255,255,255,0.02)',
    inputLine: '#9f6d52',
    inputFocus: '#e29a6f',
    accent: '#e29a6f',
    accentSoft: '#493126'
  },
  scheme9: {
    pageBg: '#121326',
    formBg: '#1b1d35',
    fontColor: '#ebe9ff',
    labelColor: '#cbc8f3',
    sidebarBg: '#17192f',
    settingsBg: '#1b1d35',
    headerBg: '#0d0f21',
    headerText: '#f3f2ff',
    subtitleText: 'rgba(216,213,255,0.74)',
    logoBg: '#7b7dd6',
    logoText: '#f8f7ff',
    btnPrimaryBg: '#666dd8',
    btnPrimaryHover: '#5158b5',
    btnPrimaryText: '#faf9ff',
    btnSecondaryBg: '#2a2d4b',
    btnSecondaryText: '#ebe9ff',
    inputBg: 'rgba(255,255,255,0.02)',
    inputLine: '#767bb2',
    inputFocus: '#9fa6ff',
    accent: '#9fa6ff',
    accentSoft: '#2a2f57'
  },
  scheme10: {
    pageBg: '#131517',
    formBg: '#1c2024',
    fontColor: '#f0f3f6',
    labelColor: '#c8d0d9',
    sidebarBg: '#181c20',
    settingsBg: '#1c2024',
    headerBg: '#0f1113',
    headerText: '#f7f9fb',
    subtitleText: 'rgba(216,223,230,0.74)',
    logoBg: '#7c8a98',
    logoText: '#f5f8fb',
    btnPrimaryBg: '#5b6a78',
    btnPrimaryHover: '#495561',
    btnPrimaryText: '#f7f9fb',
    btnSecondaryBg: '#2a3138',
    btnSecondaryText: '#f0f3f6',
    inputBg: 'rgba(255,255,255,0.02)',
    inputLine: '#778593',
    inputFocus: '#9aa9b8',
    accent: '#9aa9b8',
    accentSoft: '#2d353d'
  }
};

// Decorative background patterns for .main-content (grid, radial, diagonal, etc.).
const mainBackgroundStyles = {
  bg1: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 26px), repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 26px)',
  bg2: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.35), transparent 55%), radial-gradient(circle at 80% 0%, rgba(125,163,255,0.18), transparent 45%)',
  bg3: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0, rgba(255,255,255,0.05) 10px, transparent 10px, transparent 20px)',
  bg4: 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(0,0,0,0.04))',
  bg5: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.18) 1px, transparent 0), linear-gradient(180deg, rgba(255,255,255,0.04), rgba(0,0,0,0.03))'
};

// Default appearance settings used on first load and by Reset appearance.
const appearanceDefaults = {
  colorScheme: 'scheme1',
  mainBgStyle: 'bg1',
  fontFamily: "'DM Sans', sans-serif",
  fontSize: '14px'
};

// Writes chosen scheme + bg + font settings into CSS custom properties on documentElement.
function applyAppearanceSettings(settings) {
  const root = document.documentElement;
  const scheme = colorSchemes[settings.colorScheme] || colorSchemes.scheme1;
  root.style.setProperty('--user-font-color', scheme.fontColor);
  root.style.setProperty('--user-form-bg', scheme.formBg);
  root.style.setProperty('--user-page-bg', scheme.pageBg);
  root.style.setProperty('--user-label-color', scheme.labelColor);
  root.style.setProperty('--theme-sidebar-bg', scheme.sidebarBg);
  root.style.setProperty('--theme-settings-bg', scheme.settingsBg);
  root.style.setProperty('--theme-header-bg', scheme.headerBg);
  root.style.setProperty('--theme-header-text', scheme.headerText);
  root.style.setProperty('--theme-subtitle-text', scheme.subtitleText);
  root.style.setProperty('--theme-logo-bg', scheme.logoBg);
  root.style.setProperty('--theme-logo-text', scheme.logoText);
  root.style.setProperty('--theme-btn-primary-bg', scheme.btnPrimaryBg);
  root.style.setProperty('--theme-btn-primary-hover', scheme.btnPrimaryHover);
  root.style.setProperty('--theme-btn-primary-text', scheme.btnPrimaryText);
  root.style.setProperty('--theme-btn-secondary-bg', scheme.btnSecondaryBg);
  root.style.setProperty('--theme-btn-secondary-text', scheme.btnSecondaryText);
  root.style.setProperty('--theme-input-bg', scheme.inputBg);
  root.style.setProperty('--theme-input-line', scheme.inputLine);
  root.style.setProperty('--theme-input-focus', scheme.inputFocus);
  root.style.setProperty('--theme-accent', scheme.accent);
  root.style.setProperty('--theme-accent-soft', scheme.accentSoft);
  root.style.setProperty('--main-content-bg', mainBackgroundStyles[settings.mainBgStyle] || mainBackgroundStyles.bg1);
  root.style.setProperty('--user-font-family', settings.fontFamily);
  root.style.setProperty('--user-font-size', settings.fontSize);
  root.style.setProperty('--user-font-weight', '400');
}

// Reads current values from the settings-menu form controls.
function getAppearanceSettingsFromUI() {
  return {
    colorScheme: document.getElementById('opt-color-scheme').value,
    mainBgStyle: document.getElementById('opt-main-bg-style').value,
    fontFamily: document.getElementById('opt-font-family').value,
    fontSize: document.getElementById('opt-font-size').value
  };
}

// Apply UI settings and persist them to localStorage under 'policytool_appearance'.
function updateAppearanceSettings() {
  const settings = getAppearanceSettingsFromUI();
  applyAppearanceSettings(settings);
  localStorage.setItem('policytool_appearance', JSON.stringify(settings));
}

// Syncs settings-menu form controls to match a settings object (load / reset).
function setAppearanceUI(settings) {
  document.getElementById('opt-color-scheme').value = settings.colorScheme;
  document.getElementById('opt-main-bg-style').value = settings.mainBgStyle;
  document.getElementById('opt-font-family').value = settings.fontFamily;
  document.getElementById('opt-font-size').value = settings.fontSize;
}

// Restore defaults in the UI and re-apply + save them.
function resetAppearanceSettings() {
  setAppearanceUI(appearanceDefaults);
  updateAppearanceSettings();
}

// Load saved appearance from localStorage (or defaults), populate UI, and apply.
function loadAppearanceSettings() {
  let settings = { ...appearanceDefaults };
  try {
    const raw = localStorage.getItem('policytool_appearance');
    if (raw) settings = { ...settings, ...JSON.parse(raw) };
  } catch (_) {}
  setAppearanceUI(settings);
  applyAppearanceSettings(settings);
}

// Click-outside handler to close the settings menu; then boot appearance + sidebar + notes panel.
document.addEventListener('click', (e) => {
  const menu = document.getElementById('settings-menu');
  const btn = document.querySelector('.btn-settings');
  const overlay = document.getElementById('settings-overlay');
  if (!menu || !btn || !overlay) return;
  if (!menu.contains(e.target) && !btn.contains(e.target) && !overlay.contains(e.target)) closeSettingsMenu();
});

loadAppearanceSettings();
initSidebarResize();
initFloatingNotesPanel();
