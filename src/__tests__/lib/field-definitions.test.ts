import { describe, it, expect } from "vitest";
import {
  customFieldToFormField,
  mergeFieldsWithCustom,
  getContactFields,
  getCompanyFields,
  getDealFields,
} from "@/lib/crm/field-definitions";
import type { CustomFieldDefinition } from "@/lib/crm/field-definitions";

// Mock translation function
const mockT = (key: string) => key;

describe("customFieldToFormField", () => {
  it("should map text field type correctly", () => {
    const def: CustomFieldDefinition = {
      id: "1",
      team_id: "team1",
      entity_type: "contact",
      field_key: "custom_text",
      label: "Custom Text",
      field_type: "text",
      options: null,
      is_required: false,
      position: 0,
    };

    const result = customFieldToFormField(def);

    expect(result.name).toBe("metadata.custom_text");
    expect(result.label).toBe("Custom Text");
    expect(result.type).toBe("text");
    expect(result.required).toBe(false);
  });

  it("should map number field type correctly", () => {
    const def: CustomFieldDefinition = {
      id: "2",
      team_id: "team1",
      entity_type: "contact",
      field_key: "custom_number",
      label: "Custom Number",
      field_type: "number",
      options: null,
      is_required: true,
      position: 1,
    };

    const result = customFieldToFormField(def);

    expect(result.type).toBe("number");
    expect(result.required).toBe(true);
  });

  it("should map date field type correctly", () => {
    const def: CustomFieldDefinition = {
      id: "3",
      team_id: "team1",
      entity_type: "contact",
      field_key: "custom_date",
      label: "Custom Date",
      field_type: "date",
      options: null,
      is_required: false,
      position: 2,
    };

    const result = customFieldToFormField(def);

    expect(result.type).toBe("date");
  });

  it("should map select field type correctly with options", () => {
    const def: CustomFieldDefinition = {
      id: "4",
      team_id: "team1",
      entity_type: "contact",
      field_key: "custom_select",
      label: "Custom Select",
      field_type: "select",
      options: [
        { value: "opt1", label: "Option 1", color: "blue" },
        { value: "opt2", label: "Option 2" },
      ],
      is_required: false,
      position: 3,
    };

    const result = customFieldToFormField(def);

    expect(result.type).toBe("select");
    expect(result.options).toEqual([
      { value: "opt1", label: "Option 1" },
      { value: "opt2", label: "Option 2" },
    ]);
  });

  it("should map multi_select field type to select", () => {
    const def: CustomFieldDefinition = {
      id: "5",
      team_id: "team1",
      entity_type: "contact",
      field_key: "custom_multi",
      label: "Custom Multi",
      field_type: "multi_select",
      options: [{ value: "val1", label: "Label 1" }],
      is_required: false,
      position: 4,
    };

    const result = customFieldToFormField(def);

    expect(result.type).toBe("select");
  });

  it("should map url, email, phone field types correctly", () => {
    const urlDef: CustomFieldDefinition = {
      id: "6",
      team_id: "team1",
      entity_type: "contact",
      field_key: "custom_url",
      label: "URL",
      field_type: "url",
      options: null,
      is_required: false,
      position: 5,
    };

    const emailDef: CustomFieldDefinition = {
      ...urlDef,
      id: "7",
      field_key: "custom_email",
      field_type: "email",
    };

    const phoneDef: CustomFieldDefinition = {
      ...urlDef,
      id: "8",
      field_key: "custom_phone",
      field_type: "phone",
    };

    expect(customFieldToFormField(urlDef).type).toBe("url");
    expect(customFieldToFormField(emailDef).type).toBe("email");
    expect(customFieldToFormField(phoneDef).type).toBe("tel");
  });

  it("should map boolean field type correctly", () => {
    const def: CustomFieldDefinition = {
      id: "9",
      team_id: "team1",
      entity_type: "contact",
      field_key: "custom_bool",
      label: "Boolean",
      field_type: "boolean",
      options: null,
      is_required: false,
      position: 6,
    };

    const result = customFieldToFormField(def);

    expect(result.type).toBe("boolean");
  });

  it("should map currency field type to number with placeholder", () => {
    const def: CustomFieldDefinition = {
      id: "10",
      team_id: "team1",
      entity_type: "deal",
      field_key: "custom_currency",
      label: "Currency",
      field_type: "currency",
      options: null,
      is_required: false,
      position: 7,
    };

    const result = customFieldToFormField(def);

    expect(result.type).toBe("number");
    expect(result.placeholder).toBe("0.00");
  });

  it("should map percent field type to number with placeholder", () => {
    const def: CustomFieldDefinition = {
      id: "11",
      team_id: "team1",
      entity_type: "deal",
      field_key: "custom_percent",
      label: "Percent",
      field_type: "percent",
      options: null,
      is_required: false,
      position: 8,
    };

    const result = customFieldToFormField(def);

    expect(result.type).toBe("number");
    expect(result.placeholder).toBe("0-100");
  });

  it("should map textarea field type correctly", () => {
    const def: CustomFieldDefinition = {
      id: "12",
      team_id: "team1",
      entity_type: "contact",
      field_key: "custom_textarea",
      label: "Textarea",
      field_type: "textarea",
      options: null,
      is_required: false,
      position: 9,
    };

    const result = customFieldToFormField(def);

    expect(result.type).toBe("textarea");
  });

  it("should fallback unknown field type to text", () => {
    const def: CustomFieldDefinition = {
      id: "13",
      team_id: "team1",
      entity_type: "contact",
      field_key: "custom_unknown",
      label: "Unknown",
      field_type: "some_unknown_type",
      options: null,
      is_required: false,
      position: 10,
    };

    const result = customFieldToFormField(def);

    expect(result.type).toBe("text");
  });
});

describe("mergeFieldsWithCustom", () => {
  it("should concatenate built-in fields with custom fields", () => {
    const builtIn = [
      { name: "name", label: "Name", type: "text" as const, required: true },
      { name: "email", label: "Email", type: "email" as const, required: false },
    ];

    const customDefs: CustomFieldDefinition[] = [
      {
        id: "1",
        team_id: "team1",
        entity_type: "contact",
        field_key: "custom1",
        label: "Custom 1",
        field_type: "text",
        options: null,
        is_required: false,
        position: 0,
      },
    ];

    const result = mergeFieldsWithCustom(builtIn, customDefs);

    expect(result).toHaveLength(3);
    expect(result[0]!.name).toBe("name");
    expect(result[1]!.name).toBe("email");
    expect(result[2]!.name).toBe("metadata.custom1");
  });
});

describe("getContactFields", () => {
  it("should return 6 fields", () => {
    const fields = getContactFields(mockT);

    expect(fields).toHaveLength(6);
  });

  it("should have first_name as required field", () => {
    const fields = getContactFields(mockT);
    const firstNameField = fields.find((f) => f.name === "first_name");

    expect(firstNameField).toBeDefined();
    expect(firstNameField?.required).toBe(true);
  });
});

describe("getCompanyFields", () => {
  it("should return 6 fields", () => {
    const fields = getCompanyFields(mockT);

    expect(fields).toHaveLength(6);
  });

  it("should have name as required field", () => {
    const fields = getCompanyFields(mockT);
    const nameField = fields.find((f) => f.name === "name");

    expect(nameField).toBeDefined();
    expect(nameField?.required).toBe(true);
  });
});

describe("getDealFields", () => {
  it("should return 5 fields", () => {
    const fields = getDealFields(mockT);

    expect(fields).toHaveLength(5);
  });

  it("should have title as required field", () => {
    const fields = getDealFields(mockT);
    const titleField = fields.find((f) => f.name === "title");

    expect(titleField).toBeDefined();
    expect(titleField?.required).toBe(true);
  });
});

