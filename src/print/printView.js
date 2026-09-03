import { el } from '../ui/dom.js';
import { hasValue, FieldStatus } from '../domain/types.js';
import { paginateItems } from '../calc/pagination.js';
import { computeTotals } from '../calc/totals.js';
import { computeChecks } from '../rules/validation.js';
import { purposeEnLabel } from '../rules/screens.js';

function t(field, fallback = '') {
  if (!field) return fallback;
  if (!hasValue(field)) return fallback;
  return String(field.value);
}

function partyBlock(party) {
  const lines = [t(party.nameJa) && (hasValue(party.nameEn) ? t(party.nameEn) : t(party.nameJa))];
  const addr = [t(party.addressLine), t(party.city), t(party.prefecture), t(party.postalCode), t(party.country)].filter(Boolean).join(', ');
  if (addr) lines.push(addr);
  const contact = [t(party.contactName), t(party.phone), t(party.email)].filter(Boolean).join(' / ');
  if (contact) lines.push(contact);
  if (hasValue(party.taxRegistrationNumber)) lines.push('Tax / Reg. ID: ' + t(party.taxRegistrationNumber));
  return lines.filter(Boolean).map((l) => el('div', { text: l }));
}

/**
 * 印刷用ページ配列を組み立てる（A4縦、テンプレートのレイアウトを参考に自作）。
 * @returns {HTMLElement} .print-root
 */
export function buildPrintView(state) {
  const totals = computeTotals(state);
  const checks = computeChecks(state);
  const isDraft = checks.isDraftForced || state.invoice.documentStatus !== 'FINAL';
  const docType = state.invoice.docType?.value === 'proforma' ? 'PROFORMA INVOICE' : 'COMMERCIAL INVOICE';
  const pages = paginateItems(state.items || []);
  const totalPages = pages.length;

  const shipTo = state.shipToSameAsBuyer?.value === false ? state.shipTo : null;
  const importer = state.importerSameAsBuyer?.value === false ? state.importer : null;

  const root = el('div', { class: 'print-root' });

  pages.forEach((page) => {
    const isLast = page.pageNumber === totalPages;
    const pageEl = el('div', { class: 'print-page' });

    pageEl.appendChild(el('div', { class: 'print-title', text: docType }));
    if (isDraft) pageEl.appendChild(el('div', { class: 'print-draft-flag', text: 'DRAFT / NOT FOR SHIPMENT' }));

    pageEl.appendChild(
      el('div', { class: 'print-meta-row' }, [
        el('span', { text: `Invoice No. ${t(state.invoice.invoiceNumber)}    |    Date ${t(state.invoice.invoiceDate)}` }),
        el('span', { text: `Currency ${t(state.shipping.currency)}     |     Page ${page.pageNumber} / ${totalPages}` }),
      ])
    );

    pageEl.appendChild(
      el('div', { class: 'print-parties' }, [
        el('div', { class: 'print-party-box' }, [el('h4', { text: 'EXPORTER / SELLER' }), ...partyBlock(state.exporter)]),
        el('div', { class: 'print-party-box' }, [el('h4', { text: 'BUYER / BILL TO' }), ...partyBlock(state.buyer)]),
      ])
    );
    pageEl.appendChild(
      el('div', { class: 'print-parties' }, [
        el('div', { class: 'print-party-box' }, [el('h4', { text: 'SHIP TO / CONSIGNEE' }), ...(shipTo ? partyBlock(shipTo) : [el('div', { text: 'Same as buyer' })])]),
        el('div', { class: 'print-party-box' }, [el('h4', { text: 'IMPORTER' }), ...(importer ? partyBlock(importer) : [el('div', { text: 'Same as buyer' })])]),
      ])
    );

    pageEl.appendChild(el('div', { class: 'print-terms', text: `Terms: ${t(state.shipping.incotermCode)} ${t(state.shipping.incotermPlace)}   |   Payment: ${t(state.shipping.paymentTerms)}` }));
    pageEl.appendChild(
      el('div', {
        class: 'print-terms',
        text: `Purpose: ${purposeEnLabel(state.purpose.purpose?.value)}   |   PO: ${t(state.invoice.poNumber)}${state.invoice.docType?.value === 'proforma' ? '   |   Valid until: ' + t(state.invoice.validUntil) : ''}`,
      })
    );
    pageEl.appendChild(el('div', { class: 'print-terms', text: `From: Japan  →  ${t(state.purpose.destinationCountry)}   |   Ship date: ${t(state.packing.shipDate)}` }));

    const table = el('table', { class: 'print-items-table' });
    table.appendChild(
      el('tr', {}, ['No.', 'Description / SKU', 'HS code', 'Origin', 'Qty', 'Unit', 'Unit price', 'Amount'].map((h) => el('th', { text: h })))
    );
    page.items.forEach((item, i) => {
      const globalIndex = page.startIndex + i + 1;
      const r = hasValue(item.quantity) && hasValue(item.unitPrice) ? totals.lineResults[page.startIndex + i] : null;
      table.appendChild(
        el('tr', {}, [
          el('td', { text: String(globalIndex) }),
          el('td', { text: `${t(item.descriptionEn) || t(item.name)}${hasValue(item.sku) ? '\nSKU: ' + t(item.sku) : ''}`, class: 'print-desc-cell' }),
          el('td', { text: t(item.hsCode, '—') }),
          el('td', { text: t(item.originCountry) }),
          el('td', { text: t(item.quantity) }),
          el('td', { text: t(item.unit) }),
          el('td', { text: t(item.unitPrice) }),
          el('td', { text: r && r.ok ? r.amountStr : '' }),
        ])
      );
    });
    pageEl.appendChild(table);

    if (isLast) {
      pageEl.appendChild(
        el('div', { class: 'print-totals' }, [
          el('div', { text: `Packages: ${t(state.packing.numberOfPackages)} ${t(state.packing.packageType)}` }),
          el('div', { text: `Net / Gross weight: ${t(state.packing.netWeightKg)} / ${t(state.packing.grossWeightKg)} ${t(state.packing.weightUnit, 'kg')}` }),
          el('table', { class: 'print-totals-table' }, [
            el('tr', {}, [el('td', { text: 'Subtotal' }), el('td', { text: totals.subtotalStr })]),
            el('tr', {}, [el('td', { text: 'Charges' }), el('td', { text: totals.chargesSumStr })]),
            el('tr', { class: 'total-row' }, [el('td', { text: 'TOTAL' }), el('td', { text: `${totals.totalStr} ${totals.currency}` })]),
          ]),
        ])
      );
      const declaration = state.invoice.docType?.value === 'commercial' ? t(state.declarations.commercialText) : t(state.declarations.proformaText);
      if (declaration) pageEl.appendChild(el('div', { class: 'print-declaration', text: declaration }));
      pageEl.appendChild(
        el('div', { class: 'print-signature-row' }, [
          el('div', {}, [el('div', { text: 'Authorized signatory' }), el('div', { text: `${t(state.invoice.signatoryName)} ${t(state.invoice.signatoryTitle)}` })]),
          el('div', { text: 'Signature / Date' }),
        ])
      );
    } else {
      pageEl.appendChild(el('div', { class: 'print-continued', text: 'Continued on next page' }));
    }

    pageEl.appendChild(el('div', { class: 'print-footer', text: `${t(state.invoice.invoiceNumber)}    •    ${page.pageNumber} / ${totalPages}` }));
    root.appendChild(pageEl);
  });

  return root;
}
