// Invoice_1〜3 シートの実際の数式パターンを一般化し、31商品目以降のために
// Invoice_4 以降のシートを複製したときに書き込む数式を生成する。
// パターンは実テンプレート（assets/export-invoice-template.reference.xlsx）の
// Invoice_1/Invoice_2/Invoice_3 シートを読み取って抽出したもの。
// tests/invoiceFormulas.test.js で、生成結果がInvoice_2・Invoice_3の実際の数式と
// 一致することを回帰テストしている。

/**
 * 指定ページ番号・商品開始行に対応する Invoice_N シートの数式一覧を生成する。
 * @param {number} pageNumber 1始まり
 * @param {number} itemStartRow Itemsシート上でこのページが参照する最初の行（例: page1=3, page2=13, page3=23）
 * @returns {Record<string,string>} セル番地 -> 数式（"="始まり）
 */
export function buildInvoicePageFormulas(pageNumber, itemStartRow) {
  const f = {};
  const p = pageNumber;

  f['A1'] = `=IF(${p}<=Header!B49,IF(Header!B3="PROFORMA","PROFORMA INVOICE","COMMERCIAL INVOICE"),"UNUSED PAGE — DO NOT PRINT")`;
  f['A2'] = `=IF(Header!B45="DRAFT","DRAFT / NOT FOR SHIPMENT",IF(Header!B53<>"BASIC CHECK OK","CHECK INPUTS BEFORE ISSUE",""))`;
  f['A3'] = `="Invoice No.  "&IF(Header!B4="","",Header!B4)&"    |    Date  "&IF(Header!B5="","",Header!B5)`;
  f['E3'] = `="Currency  "&IF(Header!B6="","",Header!B6)&"     |     Page ${p} / "&Header!B49`;
  f['A4'] = 'EXPORTER / SELLER';
  f['E4'] = 'BUYER / BILL TO';
  f['A5'] =
    '=IF(Header!B18="","",IF(Header!B18="","",Header!B18)&CHAR(10)&IF(Header!B19="","",Header!B19)&CHAR(10)&IF(Header!B20="","",Header!B20)&IF(Header!B21="","",CHAR(10)&"Tax / Reg. ID: "&Header!B21))';
  f['E5'] =
    '=IF(Header!B22="","",IF(Header!B22="","",Header!B22)&CHAR(10)&IF(Header!B23="","",Header!B23)&CHAR(10)&IF(Header!B24="","",Header!B24)&IF(Header!B25="","",CHAR(10)&"Tax / Reg. ID: "&Header!B25))';
  f['A8'] = 'SHIP TO / CONSIGNEE';
  f['E8'] = 'IMPORTER';
  f['A9'] = '=IF(Header!B26="","Same as buyer",IF(Header!B26="","",Header!B26)&CHAR(10)&IF(Header!B27="","",Header!B27)&CHAR(10)&IF(Header!B28="","",Header!B28))';
  f['E9'] = '=IF(Header!B29="","Same as buyer",IF(Header!B29="","",Header!B29)&CHAR(10)&IF(Header!B30="","",Header!B30)&IF(Header!B31="","",CHAR(10)&"Tax / Reg. ID: "&Header!B31))';
  f['A11'] = '="Terms: "&IF(Header!B9="","",Header!B9)&"   |   Payment: "&IF(Header!B8="","",Header!B8)';
  f['A12'] = '="Purpose: "&IF(Header!B10="","",Header!B10)&"   |   PO: "&IF(Header!B11="","",Header!B11)&IF(Header!B3="PROFORMA","   |   Valid until: "&IF(Header!B12="","",Header!B12),"")';
  f['A13'] = '="From: "&IF(Header!B16="","",Header!B16)&"  →  "&IF(Header!B17="","",Header!B17)&"   |   Ship date: "&IF(Header!B13="","",Header!B13)&"   |   "&IF(Header!B14="","",Header!B14)';
  f['A14'] = '="Carrier / AWB: "&IF(Header!B15="","",Header!B15)';
  f['A15'] = 'No.';
  f['B15'] = 'Description / SKU';
  f['C15'] = 'HS code';
  f['D15'] = 'Origin';
  f['E15'] = 'Qty';
  f['F15'] = 'Unit';
  f['G15'] = 'Unit price';
  f['H15'] = 'Amount';

  for (let i = 0; i < 10; i++) {
    const destRow = 16 + i;
    const srcRow = itemStartRow + i;
    const position = (p - 1) * 10 + i + 1;
    f[`A${destRow}`] = `=IF(Items!B${srcRow}="","",${position})`;
    f[`B${destRow}`] = `=IF(Items!B${srcRow}="","",Items!B${srcRow}&IF(Items!A${srcRow}="","",CHAR(10)&"SKU: "&Items!A${srcRow}))`;
    f[`C${destRow}`] = `=IF(Items!B${srcRow}="","",IF(Items!C${srcRow}="","",Items!C${srcRow}))`;
    f[`D${destRow}`] = `=IF(Items!B${srcRow}="","",IF(Items!D${srcRow}="","",Items!D${srcRow}))`;
    f[`E${destRow}`] = `=IF(Items!B${srcRow}="","",IF(Items!E${srcRow}="","",Items!E${srcRow}))`;
    f[`F${destRow}`] = `=IF(Items!B${srcRow}="","",IF(Items!F${srcRow}="","",Items!F${srcRow}))`;
    f[`G${destRow}`] = `=IF(Items!B${srcRow}="","",IF(Items!G${srcRow}="","",Items!G${srcRow}))`;
    f[`H${destRow}`] = `=IF(Items!B${srcRow}="","",IF(Items!K${srcRow}="","",Items!K${srcRow}))`;
  }

  f['A26'] = `=IF(${p}=Header!B49,"Packages: "&IF(Header!B32="","",Header!B32)&" "&IF(Header!B33="","",Header!B33)&CHAR(10)&"Net / Gross weight: "&IF(Header!B34="","",Header!B34)&" / "&IF(Header!B35="","",Header!B35)&" "&IF(Header!B36="","",Header!B36),IF(${p}<=Header!B49,"Continued on next page", ""))`;
  f['F26'] = `=IF(${p}=Header!B49,"Subtotal","")`;
  f['H26'] = `=IF(${p}=Header!B49,Header!B50,"")`;
  f['F27'] = `=IF(${p}=Header!B49,"Freight","")`;
  f['H27'] = `=IF(${p}=Header!B49,Header!B37,"")`;
  f['A28'] = `=IF(${p}=Header!B49,IF(Header!B40="","",Header!B40),"")`;
  f['F28'] = `=IF(${p}=Header!B49,"Insurance","")`;
  f['H28'] = `=IF(${p}=Header!B49,Header!B38,"")`;
  f['F29'] = `=IF(${p}=Header!B49,"Other charges","")`;
  f['H29'] = `=IF(${p}=Header!B49,Header!B39,"")`;
  f['F30'] = `=IF(${p}=Header!B49,"TOTAL","")`;
  f['H30'] = `=IF(${p}=Header!B49,Header!B51,"")`;
  f['A31'] = `=IF(${p}=Header!B49,IF(Header!B3="COMMERCIAL",IF(Header!B43="","",Header!B43),IF(Header!B44="","",Header!B44)),"")`;
  f['A33'] = `=IF(${p}=Header!B49,"Authorized signatory","")`;
  f['E33'] = `=IF(${p}=Header!B49,"Signature / Date","")`;
  f['A34'] = `=IF(AND(${p}=Header!B49,Header!B41<>""),IF(Header!B41="","",Header!B41)&CHAR(10)&IF(Header!B42="","",Header!B42),"")`;
  f['A37'] = `=IF(${p}<=Header!B49,IF(Header!B4="","",Header!B4)&"    •    ${p} / "&Header!B49,"")`;

  return f;
}
