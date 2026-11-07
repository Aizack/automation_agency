with open('dashboard/src/components/SaaSErpAppointments.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace declaration
target_decl = "const [availableSlots, setAvailableSlots] = useState<string[]>([]);"
repl_decl = "const [availableSlots, setAvailableSlots] = useState<string[]>([]);"

# Add soft banner before Separated Date & Time fields
target_date_banner = """                            {/* Separated Date & Time fields */}
                            <div className="grid grid-cols-2 gap-3">"""

repl_date_banner = """                            {availabilityMeta?.blocked && (
                                <div className="p-2.5 bg-[#FEF7EC] border border-[#FEEFC3] text-[#A05E03] text-[11px] font-mono flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[16px]">info</span>
                                    <span>{availabilityMeta.reason || 'Día no laboral configurado'}. Puedes registrar la consulta igualmente como atención especial.</span>
                                </div>
                            )}

                            {/* Separated Date & Time fields */}
                            <div className="grid grid-cols-2 gap-3">"""

if target_date_banner in text:
    text = text.replace(target_date_banner, repl_date_banner)

# In the select options, use availableSlots to indicate if slot is inside regular hours
target_option = """                                        {GENERATED_30MIN_SLOTS.map(slot => {
                                            const busy = isSlotBusy(apptOnlyDate, slot);
                                            const formatted = formatApptTime(`2000-01-01T${slot}:00`);
                                            return (
                                                <option key={slot} value={slot} disabled={busy}>
                                                    {formatted} {busy ? '🔴 (Ocupado)' : '🟢 (Disponible)'}
                                                </option>
                                            );
                                        })}"""

repl_option = """                                        {GENERATED_30MIN_SLOTS.map(slot => {
                                            const busy = isSlotBusy(apptOnlyDate, slot);
                                            const formatted = formatApptTime(`2000-01-01T${slot}:00`);
                                            const isAvailableSlot = availableSlots.length === 0 || availableSlots.includes(slot);
                                            return (
                                                <option key={slot} value={slot} disabled={busy}>
                                                    {formatted} {busy ? '🔴 (Ocupado)' : (isAvailableSlot ? '🟢 (Disponible)' : '🟡 (Fuera de turno regular)')}
                                                </option>
                                            );
                                        })}"""

if target_option in text:
    text = text.replace(target_option, repl_option)

with open('dashboard/src/components/SaaSErpAppointments.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print('SUCCESS UPDATING COMPONENT')
