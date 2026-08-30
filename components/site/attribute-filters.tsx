import { Input, Select, Label } from "@/components/ui/input";
import type { Product } from "@/lib/db/types";

/**
 * Render one filter input per attribute in the selected product's schema.
 * enum → Select with prefix `attr_<key>`
 * number → two Inputs with prefix `nmin_<key>` / `nmax_<key>`
 * text → free Input `attr_<key>`
 */
export function AttributeFilters({
  product,
  values,
}: {
  product: Product;
  values: Record<string, string | string[] | undefined>;
}) {
  const schema = product.attributes_schema ?? {};
  const entries = Object.entries(schema);
  if (entries.length === 0) return null;
  const g = (k: string) => (Array.isArray(values[k]) ? values[k][0] : values[k]) as string | undefined;

  return (
    <>
      {entries.map(([key, def]: any) => {
        if (def.type === "enum") {
          return (
            <div key={key}>
              <Label>{def.label}</Label>
              <Select name={`attr_${key}`} defaultValue={g(`attr_${key}`) ?? ""}>
                <option value="">Όλες</option>
                {def.values.map((v: string) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </Select>
            </div>
          );
        }
        if (def.type === "number") {
          return (
            <div key={key} className="col-span-2">
              <Label>
                {def.label}
                {def.unit ? ` (${def.unit})` : ""}
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="από"
                  name={`nmin_${key}`}
                  defaultValue={g(`nmin_${key}`) ?? ""}
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="έως"
                  name={`nmax_${key}`}
                  defaultValue={g(`nmax_${key}`) ?? ""}
                />
              </div>
            </div>
          );
        }
        return (
          <div key={key}>
            <Label>{def.label}</Label>
            <Input name={`attr_${key}`} defaultValue={g(`attr_${key}`) ?? ""} />
          </div>
        );
      })}
    </>
  );
}
