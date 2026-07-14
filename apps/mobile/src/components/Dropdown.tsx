import { useState } from "react";
import { View, Text, Pressable, Modal, StyleSheet } from "react-native";
import { color, border } from "@runup/ui/tokens";
import { font } from "../theme.js";

/** Dropdown pequeno (chip + lista em modal) — pra filtros compactos tipo Tipo/Ano/Mês. */
export function Dropdown<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value)?.label ?? value;

  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={styles.chip}>
        <Text style={styles.chipText}>
          {label}: <Text style={styles.chipValue}>{current}</Text>
        </Text>
        <Text style={styles.chevron}>▾</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{label}</Text>
            {options.map((o) => (
              <Pressable
                key={o.value}
                onPress={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                style={styles.option}
              >
                <Text style={o.value === value ? styles.optionTextActive : styles.optionText}>
                  {o.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 99,
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: border.hairline,
  },
  chipText: { fontFamily: font.medium, fontSize: 12, color: color.textSecondary },
  chipValue: { fontFamily: font.semibold, color: color.textPrimary },
  chevron: { fontSize: 9, color: color.textFaint },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: color.surface1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: 32,
    maxHeight: "60%",
  },
  sheetTitle: {
    fontFamily: font.semibold,
    fontSize: 13,
    color: color.textMuted,
    marginBottom: 10,
  },
  option: { paddingVertical: 12, borderTopWidth: 1, borderTopColor: border.hairline },
  optionText: { fontFamily: font.regular, fontSize: 15, color: color.textSecondary },
  optionTextActive: { fontFamily: font.semibold, fontSize: 15, color: color.orange400 },
});
