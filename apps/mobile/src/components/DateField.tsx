import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { color, border } from "@runup/ui/tokens";
import { font } from "../theme.js";
import { dateToIso, isoToBr } from "../format.js";

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Campo de data: abre o calendário nativo em vez de texto livre, exibe DD/MM/AAAA. */
export function DateField({
  value,
  onChange,
  placeholder = "Selecionar data",
  minimumDate,
  maximumDate,
  style,
}: {
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  style?: StyleProp<ViewStyle>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable style={[styles.input, style]} onPress={() => setOpen(true)}>
        <Text style={value ? styles.value : styles.placeholder}>
          {value ? isoToBr(value) : placeholder}
        </Text>
      </Pressable>
      {open && (
        <>
          <DateTimePicker
            value={value ? parseIso(value) : new Date()}
            mode="date"
            display={Platform.OS === "ios" ? "inline" : "default"}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            onChange={(event, selected) => {
              if (Platform.OS === "android") setOpen(false);
              if (event.type === "set" && selected) onChange(dateToIso(selected));
            }}
          />
          {Platform.OS === "ios" && (
            <Pressable onPress={() => setOpen(false)} style={styles.doneBtn}>
              <Text style={styles.doneText}>Concluir</Text>
            </Pressable>
          )}
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: color.surface2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: border.hairline,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  value: { fontFamily: font.regular, fontSize: 14, color: color.textPrimary },
  placeholder: { fontFamily: font.regular, fontSize: 14, color: color.textMuted },
  doneBtn: { alignItems: "center", paddingVertical: 10 },
  doneText: { fontFamily: font.semibold, fontSize: 13, color: color.orange400 },
});
