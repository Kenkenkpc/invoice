import { ExportPurpose } from '../domain/types.js';

/**
 * 目的から書類種類の「候補」を提案する。
 * 重要: ここでは確定させない。「無料だから必ずProforma」のような一律判定は行わず、
 * 候補と理由、確認すべき相手を返すだけにする。
 * @param {{purpose: {value:string|null}, willShip: {value:boolean|null}, docTypeSpecifiedByOther?: {value:any}}} purposeState
 * @returns {{candidates: Array<{docType:'commercial'|'proforma', confidence:'likely'|'possible', reason:string}>, guidance:string}}
 */
export function suggestDocType(purposeState) {
  const purpose = purposeState?.purpose?.value;
  const willShip = purposeState?.willShip?.value;
  const candidates = [];
  let guidance = '相手（買主）または配送会社に、必要な書類の種類を確認するのが最も確実です。';

  if (willShip === false) {
    candidates.push({
      docType: 'proforma',
      confidence: 'likely',
      reason: 'まだ実際に発送する予定がないため、見積り・条件確認用のProforma Invoiceが使われることが多いです。',
    });
  }

  switch (purpose) {
    case ExportPurpose.SALE:
      candidates.push({
        docType: 'commercial',
        confidence: willShip === false ? 'possible' : 'likely',
        reason: '実際に代金が発生する販売のため、Commercial Invoiceが使われることが多いです。',
      });
      break;
    case ExportPurpose.QUOTE:
      candidates.push({
        docType: 'proforma',
        confidence: 'likely',
        reason: '購入前の見積り提示が目的のため、Proforma Invoiceが使われることが多いです。',
      });
      break;
    case ExportPurpose.SAMPLE:
      candidates.push({
        docType: 'commercial',
        confidence: 'possible',
        reason: '無料サンプルでも、通関のためCommercial Invoiceの提出を求める国・配送会社があります。',
      });
      candidates.push({
        docType: 'proforma',
        confidence: 'possible',
        reason: 'Proforma Invoiceで対応可能な場合もあります。請求しないことと申告価額は別問題のため、いずれの書類でも金額欄は実際の商品価値に基づいて記載する必要があります。',
      });
      guidance =
        '無料サンプルは書類種類・申告価額の扱いが国や配送会社によって異なります。配送会社（国際宅配便・フォワーダー）に必ず確認してください。';
      break;
    case ExportPurpose.REPAIR_RETURN:
      candidates.push({
        docType: 'proforma',
        confidence: 'possible',
        reason: '修理・返品目的では、通常の売買とは異なる書類（一時輸出扱いなど）が必要になる場合があります。',
      });
      guidance = '修理・返品目的は特殊な手続きが必要な場合があります。配送会社・輸入者に必ず確認してください。';
      break;
    case ExportPurpose.GIFT:
      candidates.push({
        docType: 'commercial',
        confidence: 'possible',
        reason: '贈り物でも通関のためインボイスの提出が求められるのが一般的です。',
      });
      candidates.push({
        docType: 'proforma',
        confidence: 'possible',
        reason: '配送会社によってはProforma Invoiceで対応する場合があります。',
      });
      guidance = '贈り物の場合の書類要件は配送会社によって異なります。確認してください。';
      break;
    case ExportPurpose.OTHER:
    case ExportPurpose.UNKNOWN:
    default:
      guidance = '目的が確定していないため、候補を絞り込めません。相手または配送会社に確認してください。';
      break;
  }

  // 重複するdocTypeがあれば信頼度の高い方を残す
  const byType = new Map();
  for (const c of candidates) {
    const existing = byType.get(c.docType);
    if (!existing || (existing.confidence !== 'likely' && c.confidence === 'likely')) {
      byType.set(c.docType, c);
    }
  }

  return { candidates: [...byType.values()], guidance };
}
