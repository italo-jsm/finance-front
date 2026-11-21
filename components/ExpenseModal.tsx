"use client";

import type { ComponentProps } from "react";
import { FormModal } from "./FormModal";

export function ExpenseModal(props: Omit<ComponentProps<typeof FormModal>, "initialField">) {
  return <FormModal {...props} initialField="#expense-value" />;
}
