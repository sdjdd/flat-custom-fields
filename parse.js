class TicketRow {
  /**
   * @param {Record<string, string>} data
   */
  constructor(data, row) {
    this.data = data;

    /**
     * @type {string}
     */
    this.customFormName = data['customForm.title'] || data['customFrom.title'];

    if (typeof this.customFormName !== 'string') {
      throw new Error(`Row ${row}: customForm.title is not string`);
    }

    /**
     * @type {Record<string, any>}
     */
    this.customFields = {};

    const customFields = data['customForm.fields'] || data['customFrom.fields'];
    if (customFields) {
      const customFieldArray = JSON.parse(customFields);
      if (Array.isArray(customFieldArray)) {
        for (const field of customFieldArray) {
          if (!field) {
            throw new Error(`Row ${row}: Invalid customForm.fields`);
          }
          if (typeof field.id !== 'string') {
            throw new Error(
              `Row ${row}: Invalid customForm.fields: id is not string`
            );
          }
          if (typeof field.title !== 'string') {
            throw new Error(
              `Row ${row}: Invalid customForm.fields: title is not string`
            );
          }
          if (field.title in this.customFields) {
            throw new Error(
              `Row ${row}: Invalid customForm.fields: duplicated title`
            );
          }
          this.customFields[field.title] = field.value;
        }
      }
    }
  }

  /**
   * @param {[string, string[]][]} forms
   */
  applyForms(forms) {
    forms.forEach(([formName, fieldNames]) => {
      if (formName === this.customFormName) {
        fieldNames.forEach((fieldName) => {
          const value = this.customFields[fieldName];
          this.data[`${formName}.${fieldName}`] = str(value);
        });
      } else {
        fieldNames.forEach((fieldName) => {
          this.data[`${formName}.${fieldName}`] = '';
        });
      }
    });
  }
}

function str(value) {
  if (typeof value === 'string') {
    return value;
  }
  if (value === undefined || value === null) {
    return '';
  }
  return JSON.stringify(value);
}

/**
 * @param {Record<string, Set<string>>} forms
 */
function getOrderedForms(forms) {
  const keys = Object.keys(forms);
  keys.sort();

  /**
   * @type {[string, string[]][]}
   */
  const orderedForms = [];

  keys.forEach((key) => {
    const fieldSet = forms[key];
    const fields = Array.from(fieldSet);
    fields.sort();
    orderedForms.push([key, fields]);
  });

  return orderedForms;
}

function parse(input) {
  const result = Papa.parse(input.trim(), { header: true });

  if (result.errors.length) {
    const error = result.errors[0];
    const message = `${error.code}: ${error.message}`;
    throw new Error(message);
  }

  const ticketRows = result.data.map((data, i) => new TicketRow(data, i + 1));

  /**
   * @type {Record<string, Set<string>>}
   */
  const forms = {};

  ticketRows.forEach((tr) => {
    const form = forms[tr.customFormName] || new Set();
    Object.keys(tr.customFields).forEach((field) => {
      form.add(field);
    });
    forms[tr.customFormName] = form;
  });

  const orderedForms = getOrderedForms(forms);

  ticketRows.forEach((tr) => {
    tr.applyForms(orderedForms);
  });

  const output = Papa.unparse(ticketRows.map((tr) => tr.data));

  return output;
}
