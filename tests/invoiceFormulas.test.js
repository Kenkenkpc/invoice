// 実テンプレートの Invoice_2 / Invoice_3 から抽出した実際の数式との回帰テスト
{
  const f2 = buildInvoicePageFormulas(2, 13);
  assertEqual(f2['A1'], '=IF(2<=Header!B49,IF(Header!B3="PROFORMA","PROFORMA INVOICE","COMMERCIAL INVOICE"),"UNUSED PAGE — DO NOT PRINT")', 'Invoice_2 A1');
  assertEqual(f2['A2'], '=IF(Header!B45="DRAFT","DRAFT / NOT FOR SHIPMENT",IF(Header!B53<>"BASIC CHECK OK","CHECK INPUTS BEFORE ISSUE",""))', 'Invoice_2 A2');
  assertEqual(f2['A3'], '="Invoice No.  "&IF(Header!B4="","",Header!B4)&"    |    Date  "&IF(Header!B5="","",Header!B5)', 'Invoice_2 A3');
  assertEqual(f2['E3'], '="Currency  "&IF(Header!B6="","",Header!B6)&"     |     Page 2 / "&Header!B49', 'Invoice_2 E3');
  assertEqual(f2['A16'], '=IF(Items!B13="","",11)', 'Invoice_2 A16 (position 11)');
  assertEqual(f2['B16'], '=IF(Items!B13="","",Items!B13&IF(Items!A13="","",CHAR(10)&"SKU: "&Items!A13))', 'Invoice_2 B16');
  assertEqual(f2['A25'], '=IF(Items!B22="","",20)', 'Invoice_2 A25 (position 20)');
  assertEqual(f2['B25'], '=IF(Items!B22="","",Items!B22&IF(Items!A22="","",CHAR(10)&"SKU: "&Items!A22))', 'Invoice_2 B25');
  assertEqual(
    f2['A26'],
    '=IF(2=Header!B49,"Packages: "&IF(Header!B32="","",Header!B32)&" "&IF(Header!B33="","",Header!B33)&CHAR(10)&"Net / Gross weight: "&IF(Header!B34="","",Header!B34)&" / "&IF(Header!B35="","",Header!B35)&" "&IF(Header!B36="","",Header!B36),IF(2<=Header!B49,"Continued on next page", ""))',
    'Invoice_2 A26'
  );
  assertEqual(f2['F26'], '=IF(2=Header!B49,"Subtotal","")', 'Invoice_2 F26');
  assertEqual(f2['H26'], '=IF(2=Header!B49,Header!B50,"")', 'Invoice_2 H26');
  assertEqual(
    f2['A31'],
    '=IF(2=Header!B49,IF(Header!B3="COMMERCIAL",IF(Header!B43="","",Header!B43),IF(Header!B44="","",Header!B44)),"")',
    'Invoice_2 A31'
  );
  assertEqual(f2['A37'], '=IF(2<=Header!B49,IF(Header!B4="","",Header!B4)&"    •    2 / "&Header!B49,"")', 'Invoice_2 A37');
}

{
  const f3 = buildInvoicePageFormulas(3, 23);
  assertEqual(f3['A1'], '=IF(3<=Header!B49,IF(Header!B3="PROFORMA","PROFORMA INVOICE","COMMERCIAL INVOICE"),"UNUSED PAGE — DO NOT PRINT")', 'Invoice_3 A1');
  assertEqual(f3['A3'], '="Invoice No.  "&IF(Header!B4="","",Header!B4)&"    |    Date  "&IF(Header!B5="","",Header!B5)', 'Invoice_3 A3');
  assertEqual(f3['E3'], '="Currency  "&IF(Header!B6="","",Header!B6)&"     |     Page 3 / "&Header!B49', 'Invoice_3 E3');
  assertEqual(f3['A16'], '=IF(Items!B23="","",21)', 'Invoice_3 A16 (position 21)');
  assertEqual(f3['A25'], '=IF(Items!B32="","",30)', 'Invoice_3 A25 (position 30)');
  assertEqual(
    f3['A26'],
    '=IF(3=Header!B49,"Packages: "&IF(Header!B32="","",Header!B32)&" "&IF(Header!B33="","",Header!B33)&CHAR(10)&"Net / Gross weight: "&IF(Header!B34="","",Header!B34)&" / "&IF(Header!B35="","",Header!B35)&" "&IF(Header!B36="","",Header!B36),IF(3<=Header!B49,"Continued on next page", ""))',
    'Invoice_3 A26'
  );
  assertEqual(
    f3['A31'],
    '=IF(3=Header!B49,IF(Header!B3="COMMERCIAL",IF(Header!B43="","",Header!B43),IF(Header!B44="","",Header!B44)),"")',
    'Invoice_3 A31'
  );
  assertEqual(f3['A37'], '=IF(3<=Header!B49,IF(Header!B4="","",Header!B4)&"    •    3 / "&Header!B49,"")', 'Invoice_3 A37');
}

// ページ4（テンプレート未収録・31商品目以降のために動的生成する分）の妥当性
{
  const f4 = buildInvoicePageFormulas(4, 33);
  assertEqual(f4['A16'], '=IF(Items!B33="","",31)', 'Invoice_4 A16 (position 31, 31商品目)');
  assertTrue(f4['A1'].includes('4<=Header!B49'), 'Invoice_4はページ番号4を参照する');
}

summary();
