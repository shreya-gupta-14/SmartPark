// same as RATE_CARD table
var rateCard = { CAR: 20, BIKE: 10 };

// same as SLOTS table
var slots = [
  { slot_id: 1, slot_type: 'CAR', is_occupied: false },
  { slot_id: 2, slot_type: 'CAR', is_occupied: false },
  { slot_id: 3, slot_type: 'BIKE', is_occupied: false },
  { slot_id: 4, slot_type: 'BIKE', is_occupied: false }
];

// same as VEHICLES table
var vehicles = {};

// same as PARKING_LOG table
var parkingLog = [];
var logSeq = 1;

// same as calc_bill() function
function calcBill(entryTime, exitTime, vtype) {
  var hours = Math.ceil((exitTime - entryTime) / (1000 * 60 * 60));
  if (hours === 0) hours = 1;
  return hours * rateCard[vtype];
}

// same as allocate_slot() procedure
function allocateSlot() {
  var vNo = document.getElementById('vNo').value.trim().toUpperCase();
  var vOwner = document.getElementById('vOwner').value.trim();
  var vType = document.getElementById('vType').value;
  var msg = document.getElementById('entryMsg');

  if (!vNo || !vOwner) {
    msg.className = 'msg err';
    msg.textContent = 'Enter both vehicle number and owner name.';
    return;
  }

  var freeSlot = null;
  for (var i = 0; i < slots.length; i++) {
    if (slots[i].slot_type === vType && !slots[i].is_occupied) {
      freeSlot = slots[i];
      break;
    }
  }

  // exception: no slot available
  if (!freeSlot) {
    msg.className = 'msg err';
    msg.textContent = 'No free ' + vType + ' slot available.';
    return;
  }

  if (!vehicles[vNo]) {
    vehicles[vNo] = { owner_name: vOwner, vehicle_type: vType };
  }

  freeSlot.is_occupied = true;

  parkingLog.push({
    log_id: logSeq,
    vehicle_no: vNo,
    slot_id: freeSlot.slot_id,
    entry_time: new Date(),
    exit_time: null,
    bill_amount: null
  });
  logSeq++;

  msg.className = 'msg ok';
  msg.textContent = 'Slot ' + freeSlot.slot_id + ' allocated to ' + vNo;

  document.getElementById('vNo').value = '';
  document.getElementById('vOwner').value = '';
  renderAll();
}

// same as trigger firing on exit
function exitVehicle() {
  var logId = Number(document.getElementById('exitSelect').value);
  var msg = document.getElementById('exitMsg');
  var entry = null;
  for (var i = 0; i < parkingLog.length; i++) {
    if (parkingLog[i].log_id === logId) entry = parkingLog[i];
  }

  if (!entry) {
    msg.className = 'msg err';
    msg.textContent = 'Select a parked vehicle first.';
    return;
  }

  var vtype = vehicles[entry.vehicle_no].vehicle_type;
  entry.exit_time = new Date();
  entry.bill_amount = calcBill(entry.entry_time, entry.exit_time, vtype);

  for (var j = 0; j < slots.length; j++) {
    if (slots[j].slot_id === entry.slot_id) slots[j].is_occupied = false;
  }

  msg.className = 'msg ok';
  msg.textContent = entry.vehicle_no + ' exited. Bill: Rs.' + entry.bill_amount;
  renderAll();
}

function fmtTime(d) {
  if (!d) return '-';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function renderAll() {
  var grid = document.getElementById('slotGrid');
  grid.innerHTML = '';
  for (var i = 0; i < slots.length; i++) {
    var s = slots[i];
    var div = document.createElement('div');
    div.className = 'slot ' + (s.is_occupied ? 'occupied' : 'free');
    div.innerHTML = '<div>Slot ' + s.slot_id + '</div><div>' + s.slot_type + '</div>' +
      '<div class="state">' + (s.is_occupied ? 'Occupied' : 'Free') + '</div>';
    grid.appendChild(div);
  }

  var exitSelect = document.getElementById('exitSelect');
  var parked = [];
  for (var k = 0; k < parkingLog.length; k++) {
    if (!parkingLog[k].exit_time) parked.push(parkingLog[k]);
  }
  exitSelect.innerHTML = '';
  if (parked.length === 0) {
    exitSelect.innerHTML = '<option value="">No vehicles parked</option>';
  } else {
    for (var m = 0; m < parked.length; m++) {
      var opt = document.createElement('option');
      opt.value = parked[m].log_id;
      opt.textContent = parked[m].vehicle_no + ' - Slot ' + parked[m].slot_id;
      exitSelect.appendChild(opt);
    }
  }

  var body = document.getElementById('logBody');
  body.innerHTML = '';
  for (var n = parkingLog.length - 1; n >= 0; n--) {
    var l = parkingLog[n];
    var tr = document.createElement('tr');
    tr.innerHTML = '<td><span class="plate">' + l.vehicle_no + '</span></td>' +
      '<td>' + l.slot_id + '</td>' +
      '<td>' + fmtTime(l.entry_time) + '</td>' +
      '<td>' + fmtTime(l.exit_time) + '</td>' +
      '<td>' + (l.bill_amount !== null ? 'Rs.' + l.bill_amount : '-') + '</td>' +
      '<td>' + (l.exit_time ? 'Billed' : 'Parked') + '</td>';
    body.appendChild(tr);
  }

  document.getElementById('statFree').textContent =
    slots.filter(function(s) { return !s.is_occupied; }).length;
  document.getElementById('statParked').textContent = parked.length;

  var total = 0;
  for (var p = 0; p < parkingLog.length; p++) {
    total += parkingLog[p].bill_amount || 0;
  }
  document.getElementById('statRevenue').textContent = 'Rs.' + total;
}
// theme toggle
function toggleTheme() {
  var body = document.body;
  var checkbox = document.getElementById('themeToggle');

  if (checkbox.checked) {
    body.classList.add('light-mode');
  } else {
    body.classList.remove('light-mode');
  }
}

renderAll();
