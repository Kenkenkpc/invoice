// 31商品目以降に対応するための Items シート行・Header 集計式の拡張。
// テンプレート標準の30行(3〜32)を超える場合のみ使用する。
import { ITEMS_FIRST_ROW, ITEMS_LAST_ROW } from '../rules/templateMapping.js';

/** Items シートの1行分の計算式（K・M・N列）をテンプレートと同じパターンで生成する。 */
export function buildItemRowFormulas(row) {
  return {
    [`K${row}`]: `=IF(OR(B${row}="",E${row}="",G${row}=""),"",ROUND(E${row}*G${row},Header!$B$7))`,
    [`M${row}`]: `=IF(COUNTA(A${row}:J${row})=0,"",IF(OR(B${row}="",D${row}="",NOT(ISNUMBER(E${row})),E${row}<=0,F${row}="",NOT(ISNUMBER(G${row})),G${row}<0,G${row}<>ROUND(G${row},4)),"CHECK REQUIRED FIELDS",IF(LEN(B${row})>110,"CHECK DESCRIPTION LENGTH","OK")))`,
    [`N${row}`]: `=IF(B${row}="","",${row - ITEMS_FIRST_ROW + 1})`,
  };
}

/** 商品数が30件を超える場合の Header 側集計式（参照範囲を拡張したもの）。 */
export function buildExtendedHeaderTotals(lastItemRow) {
  return {
    B48: `=COUNT(Items!N3:N${lastItemRow})`,
    B49: `=MAX(1,ROUNDUP(MAX(Items!N3:N${lastItemRow})/10,0))`,
    B50: `=SUM(Items!K3:K${lastItemRow})`,
    B52: `=COUNTIF(Items!M3:M${lastItemRow},"CHECK*")`,
  };
}

export function needsExtension(itemCount) {
  return ITEMS_FIRST_ROW + itemCount - 1 > ITEMS_LAST_ROW;
}
