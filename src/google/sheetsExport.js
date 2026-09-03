import { ensureAccessToken, isGoogleConfigured } from './sheetsAuth.js';
import { TEMPLATE_SPREADSHEET_ID } from './config.js';
import { HEADER_ROW, HEADER_VALUE_COLUMN, ITEMS_FIRST_ROW, ITEMS_COLUMN, SHEET_NAMES } from '../rules/templateMapping.js';
import { buildItemRowFormulas, buildExtendedHeaderTotals, needsExtension } from './itemsExtension.js';
import { buildInvoicePageFormulas } from './invoicePageFormulas.js';
import { hasValue } from '../domain/types.js';
import { computeTotals } from '../calc/totals.js';
import { computeChecks } from '../rules/validation.js';
import { paginateItems, BASE_ITEMS_PER_PAGE } from '../calc/pagination.js';
import { purposeEnLabel } from '../rules/screens.js';

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';

function sanitizeFilenamePart(text) {
  return String(text || '').replace(/[\\/:*?"<>|]/g, ' ').trim();
}

export function buildFileName(state, isDraft) {
  const docType = state.invoice.docType?.value === 'proforma' ? 'Proforma Invoice' : 'Commercial Invoice';
  const invoiceNumber = hasValue(state.invoice.invoiceNumber) ? state.invoice.invoiceNumber.value : '未採番';
  const partyName = hasValue(state.buyer.nameEn)
    ? state.buyer.nameEn.value
    : hasValue(state.buyer.nameJa)
      ? state.buyer.nameJa.value
      : '取引先未定';
  const base = `${docType}_${invoiceNumber}_${sanitizeFilenamePart(partyName)}`;
  return isDraft ? `DRAFT_${base}` : base;
}

async function apiFetch(url, token, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.json();
      detail = body?.error?.message || '';
    } catch (e) {
      /* ignore */
    }
    const err = /** @type {Error & {status:number}} */ (new Error(`Google APIエラー (${res.status}) ${detail}`));
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}

function partyToHeaderStrings(party) {
  const name = hasValue(party.nameEn) ? party.nameEn.value : hasValue(party.nameJa) ? party.nameJa.value : '';
  const addressParts = [party.addressLine, party.city, party.prefecture, party.postalCode, party.country]
    .map((f) => (hasValue(f) ? f.value : ''))
    .filter(Boolean);
  const contactParts = [party.contactName, party.phone, party.email].map((f) => (hasValue(f) ? f.value : '')).filter(Boolean);
  return {
    company: name,
    address: addressParts.join(', '),
    contact: contactParts.join(' / '),
    taxId: hasValue(party.taxRegistrationNumber) ? party.taxRegistrationNumber.value : '',
  };
}

function buildHeaderValueUpdates(state, isDraft) {
  const totals = computeTotals(state);
  const hv = (key, value) => ({
    range: `${SHEET_NAMES.header}!${HEADER_VALUE_COLUMN}${HEADER_ROW[key]}`,
    values: [[value]],
  });

  const exporter = partyToHeaderStrings(state.exporter);
  const buyer = partyToHeaderStrings(state.buyer);
  const shipTo = state.shipToSameAsBuyer.value === false ? partyToHeaderStrings(state.shipTo) : { company: '', address: '', contact: '', taxId: '' };
  const importer = state.importerSameAsBuyer.value === false ? partyToHeaderStrings(state.importer) : { company: '', address: '', contact: '', taxId: '' };

  const g = (field, fallback = '') => (hasValue(field) ? field.value : fallback);

  const updates = [
    hv('invoice_type', state.invoice.docType?.value === 'proforma' ? 'PROFORMA' : 'COMMERCIAL'),
    hv('invoice_number', g(state.invoice.invoiceNumber)),
    hv('invoice_date', g(state.invoice.invoiceDate)),
    hv('currency', g(state.shipping.currency)),
    hv('currency_decimals', Number(totals.decimals)),
    hv('payment_terms', g(state.shipping.paymentTerms)),
    hv('incoterms', [g(state.shipping.incotermCode), g(state.shipping.incotermPlace)].filter(Boolean).join(' ')),
    hv('purpose_of_export', purposeEnLabel(state.purpose.purpose?.value) || g(state.purpose.purpose)),
    hv('po_number', g(state.invoice.poNumber)),
    hv('valid_until', g(state.invoice.validUntil)),
    hv('shipping_date', g(state.packing.shipDate)),
    hv('shipping_method', g(state.shipping.shippingMethod)),
    hv('carrier_tracking', [g(state.packing.carrier), g(state.packing.trackingNumber)].filter(Boolean).join(' / ')),
    hv('export_country', 'Japan'),
    hv('destination_country', g(state.purpose.destinationCountry)),
    hv('exporter_company', exporter.company),
    hv('exporter_address', exporter.address),
    hv('exporter_contact', exporter.contact),
    hv('exporter_tax_id', exporter.taxId),
    hv('buyer_company', buyer.company),
    hv('buyer_address', buyer.address),
    hv('buyer_contact', buyer.contact),
    hv('buyer_tax_id', buyer.taxId),
    hv('ship_to_company', shipTo.company),
    hv('ship_to_address', shipTo.address),
    hv('ship_to_contact', shipTo.contact),
    hv('importer_company', importer.company),
    hv('importer_address', importer.address),
    hv('importer_tax_id', importer.taxId),
    hv('number_of_packages', hasValue(state.packing.numberOfPackages) ? Number(state.packing.numberOfPackages.value) : ''),
    hv('package_type', g(state.packing.packageType)),
    hv('net_weight', hasValue(state.packing.netWeightKg) ? Number(state.packing.netWeightKg.value) : ''),
    hv('gross_weight', hasValue(state.packing.grossWeightKg) ? Number(state.packing.grossWeightKg.value) : ''),
    hv('weight_unit', g(state.packing.weightUnit, 'kg')),
    hv('freight_charge', state.shipping.freightIncludedInPrice?.value === true ? 0 : hasValue(state.charges.freight) ? Number(state.charges.freight.value) : 0),
    hv('insurance_charge', hasValue(state.charges.insurance) ? Number(state.charges.insurance.value) : 0),
    hv('other_charge', hasValue(state.charges.other) ? Number(state.charges.other.value) : 0),
    hv('remarks', g(state.invoice.remarks)),
    hv('signatory_name', g(state.invoice.signatoryName)),
    hv('signatory_title', g(state.invoice.signatoryTitle)),
    hv('commercial_declaration', g(state.declarations.commercialText)),
    hv('proforma_declaration', g(state.declarations.proformaText)),
    hv('document_status', isDraft ? 'DRAFT' : 'FINAL'),
  ];
  return updates;
}

function buildItemsValueUpdates(state) {
  const updates = [];
  (state.items || []).forEach((item, idx) => {
    const row = ITEMS_FIRST_ROW + idx;
    const g = (field) => (hasValue(field) ? field.value : '');
    const set = (col, value) => updates.push({ range: `${SHEET_NAMES.items}!${ITEMS_COLUMN[col]}${row}`, values: [[value]] });
    set('sku', g(item.sku));
    set('description', g(item.descriptionEn) || g(item.name));
    set('hs_code', g(item.hsCode));
    set('origin_country', g(item.originCountry));
    set('quantity', hasValue(item.quantity) ? Number(item.quantity.value) : '');
    set('unit', g(item.unit));
    set('unit_price', hasValue(item.unitPrice) ? Number(item.unitPrice.value) : '');
    set('net_weight', hasValue(item.netWeightKg) ? Number(item.netWeightKg.value) : '');
    set('gross_weight', hasValue(item.grossWeightKg) ? Number(item.grossWeightKg.value) : '');
    set('weight_unit', hasValue(state.packing.weightUnit) ? state.packing.weightUnit.value : 'kg');
    set('memo', g(item.modelSerial));
  });
  return updates;
}

/**
 * 回答データから新しいGoogleスプレッドシートを作成する（テンプレートを複製→Header/Itemsへ反映）。
 * 進行状況は onProgress(stepLabel) で通知する。
 * @param {any} state
 * @param {{isDraft?:boolean, onProgress?:(label:string)=>void}} [opts]
 */
export async function exportToGoogleSheets(state, opts = {}) {
  const { isDraft, onProgress } = opts;
  if (!isGoogleConfigured()) {
    const err = /** @type {Error & {code:string}} */ (
      new Error('Google連携が未設定です。docs/google-setup.md の手順でOAuthクライアントIDを設定してください。')
    );
    err.code = 'NOT_CONFIGURED';
    throw err;
  }
  const progress = (label) => onProgress && onProgress(label);

  progress('Googleアカウントに接続しています…');
  const token = await ensureAccessToken();

  progress('テンプレートをコピーしています…');
  const fileName = buildFileName(state, isDraft);
  const copyRes = await apiFetch(`${DRIVE_API}/files/${TEMPLATE_SPREADSHEET_ID}/copy`, token, {
    method: 'POST',
    body: JSON.stringify({ name: fileName }),
  });
  const spreadsheetId = copyRes.id;

  progress('入力内容を書き込んでいます…');
  const valueUpdates = [...buildHeaderValueUpdates(state, isDraft), ...buildItemsValueUpdates(state)];

  const itemCount = (state.items || []).length;
  let firstNeededSheetTitle = 'Invoice_1';
  const structuralRequests = [];

  if (needsExtension(itemCount)) {
    progress('商品数が30件を超えるため、印刷用シートを追加しています…');
    const lastRow = ITEMS_FIRST_ROW + itemCount - 1;
    for (let row = ITEMS_FIRST_ROW + 30; row <= lastRow; row++) {
      const formulas = buildItemRowFormulas(row);
      for (const [cell, formula] of Object.entries(formulas)) {
        valueUpdates.push({ range: `${SHEET_NAMES.items}!${cell}`, values: [[formula]] });
      }
    }
    const extendedTotals = buildExtendedHeaderTotals(lastRow);
    for (const [cell, formula] of Object.entries(extendedTotals)) {
      valueUpdates.push({ range: `${SHEET_NAMES.header}!${cell}`, values: [[formula]] });
    }

    const pages = paginateItemsCount(itemCount);
    const meta = await apiFetch(`${SHEETS_API}/${spreadsheetId}?fields=sheets.properties`, token);
    const invoice3 = meta.sheets.find((s) => s.properties.title === 'Invoice_3');
    for (let pageNum = 4; pageNum <= pages; pageNum++) {
      const newTitle = `Invoice_${pageNum}`;
      structuralRequests.push({
        duplicateSheet: {
          sourceSheetId: invoice3.properties.sheetId,
          insertSheetIndex: invoice3.properties.index + (pageNum - 3),
          newSheetName: newTitle,
        },
      });
    }
  }

  if (structuralRequests.length > 0) {
    const dupRes = await apiFetch(`${SHEETS_API}/${spreadsheetId}:batchUpdate`, token, {
      method: 'POST',
      body: JSON.stringify({ requests: structuralRequests }),
    });
    const replies = dupRes.replies || [];
    replies.forEach((reply, i) => {
      const pageNum = 4 + i;
      const newSheetId = reply.duplicateSheet.properties.sheetId;
      const itemStartRow = ITEMS_FIRST_ROW + (pageNum - 1) * BASE_ITEMS_PER_PAGE;
      const formulas = buildInvoicePageFormulas(pageNum, itemStartRow);
      for (const [cell, formula] of Object.entries(formulas)) {
        valueUpdates.push({ range: `Invoice_${pageNum}!${cell}`, values: [[formula]] });
      }
    });
  }

  await apiFetch(`${SHEETS_API}/${spreadsheetId}/values:batchUpdate`, token, {
    method: 'POST',
    body: JSON.stringify({ valueInputOption: 'RAW', data: valueUpdates }),
  });

  const pagesNeeded = paginateItemsCount(itemCount);
  firstNeededSheetTitle = pagesNeeded >= 1 ? 'Invoice_1' : 'Invoice_1';

  progress('表示するシートを設定しています…');
  try {
    const meta2 = await apiFetch(`${SHEETS_API}/${spreadsheetId}?fields=sheets.properties`, token);
    const target = meta2.sheets.find((s) => s.properties.title === firstNeededSheetTitle);
    if (target) {
      await apiFetch(`${SHEETS_API}/${spreadsheetId}:batchUpdate`, token, {
        method: 'POST',
        body: JSON.stringify({ requests: [{ updateSheetProperties: { properties: { sheetId: target.properties.sheetId, index: 0 }, fields: 'index' } }] }),
      });
    }
  } catch (e) {
    // 表示シートの並び替えに失敗しても致命的ではないため、作成自体は成功として扱う
  }

  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  return { spreadsheetId, url, fileName };
}

function paginateItemsCount(n) {
  return Math.max(1, Math.ceil(n / BASE_ITEMS_PER_PAGE));
}

/**
 * 作成後の検証: コピー先を読み戻し、書類種別・総額・商品件数などが反映されているかを確認する。
 */
export async function verifyExportedSpreadsheet(spreadsheetId, state) {
  const token = await ensureAccessToken();
  const ranges = [
    `${SHEET_NAMES.header}!A1:C53`,
    `${SHEET_NAMES.items}!A1:N${ITEMS_FIRST_ROW + Math.max((state.items || []).length, 1)}`,
  ];
  const query = ranges.map((r) => `ranges=${encodeURIComponent(r)}`).join('&');
  const data = await apiFetch(`${SHEETS_API}/${spreadsheetId}/values:batchGet?${query}`, token);
  const headerRows = data.valueRanges[0].values || [];
  const findHeaderValue = (row) => {
    const found = headerRows.find((r) => r[0] === row);
    return found ? found[1] : undefined;
  };
  const totals = computeTotals(state);
  const checks = {
    isDifferentFile: spreadsheetId !== TEMPLATE_SPREADSHEET_ID,
    docTypeMatches:
      findHeaderValue('invoice_type') === (state.invoice.docType?.value === 'proforma' ? 'PROFORMA' : 'COMMERCIAL'),
    buyerReflected: !!findHeaderValue('buyer_company'),
    totalReflected: findHeaderValue('total') !== undefined,
    basicCheckValue: findHeaderValue('basic_check'),
  };
  return checks;
}
