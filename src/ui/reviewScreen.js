import { el } from './dom.js';
import { hasValue, FieldStatus } from '../domain/types.js';
import { computeChecks } from '../rules/validation.js';
import { computeTotals } from '../calc/totals.js';
import { suggestDocType } from '../rules/docType.js';
import { purposeJaLabel } from '../rules/screens.js';

function v(field, fallback = '（未入力）') {
  if (!field) return fallback;
  if (field.status === FieldStatus.UNKNOWN) return 'わからない（確認待ち）';
  if (field.status === FieldStatus.NOT_APPLICABLE) return '該当なし';
  if (!hasValue(field)) return fallback;
  return typeof field.value === 'boolean' ? (field.value ? 'はい' : 'いいえ') : String(field.value);
}

function sectionCard(title, screenId, bodyNodes, onJump) {
  return el('section', { class: 'review-card' }, [
    el('div', { class: 'review-card-header' }, [
      el('h3', { text: title }),
      el('button', { type: 'button', class: 'link-btn', onclick: () => onJump(screenId) }, 'この項目を編集'),
    ]),
    el('div', { class: 'review-card-body' }, bodyNodes),
  ]);
}

function partySummary(party) {
  return el('div', {}, [
    el('p', { text: `${v(party.nameJa)}${hasValue(party.nameEn) ? ' / ' + v(party.nameEn) : ''}` }),
    el('p', { text: `${v(party.postalCode)} ${v(party.prefecture)}${v(party.city)}${v(party.addressLine)}` }),
    el('p', { text: v(party.country) }),
    el('p', { text: `担当: ${v(party.contactName)} / ${v(party.phone)} / ${v(party.email)}` }),
  ]);
}

export function renderReviewScreen(state, ctx) {
  const container = el('div', { class: 'review-screen' });
  const checks = computeChecks(state);
  const totals = computeTotals(state);
  const docSuggestion = suggestDocType(state.purpose);

  const isDraft = checks.isDraftForced || state.invoice.documentStatus !== 'FINAL';

  const banner = el('div', { class: 'draft-banner ' + (isDraft ? 'draft' : 'final') }, [
    el('strong', { text: isDraft ? 'この書類は現在 DRAFT（下書き）です' : 'FINAL として出力できます' }),
    el('p', {
      text: checks.isDraftForced
        ? '未解決の必須項目があるため、正式版ではなく下書きとして保存されます。下書きの保存は今すぐ行えます。'
        : state.invoice.documentStatus === 'FINAL'
          ? '必須項目はすべて確認済みです。'
          : '必須項目はすべて確認済みです。内容に間違いがなければ、下のボタンでFINALに切り替えられます。',
    }),
  ]);
  if (!checks.isDraftForced) {
    if (state.invoice.documentStatus === 'FINAL') {
      banner.appendChild(
        el(
          'button',
          {
            type: 'button',
            class: 'secondary-btn',
            onclick: () => ctx.onChangeDocumentStatus('DRAFT'),
          },
          'DRAFTに戻す'
        )
      );
    } else {
      banner.appendChild(
        el(
          'button',
          {
            type: 'button',
            class: 'primary-btn',
            onclick: () => ctx.onChangeDocumentStatus('FINAL'),
          },
          '内容を確認済みとして FINAL にする'
        )
      );
    }
  }
  container.appendChild(banner);

  container.appendChild(
    sectionCard(
      '作成する書類の種類と用途',
      'purpose',
      [
        el('p', { text: `目的: ${state.purpose.purpose.value ? purposeJaLabel(state.purpose.purpose.value) : v(state.purpose.purpose)}` }),
        el('p', { text: `書類種別: ${v(state.invoice.docType)}${state.invoice.docType.status !== FieldStatus.CONFIRMED ? '（未確認）' : '（確認済み）'}` }),
        el('p', { class: 'field-note', text: 'システムが提案しただけの候補: ' + docSuggestion.candidates.map((c) => `${c.docType}(${c.confidence})`).join(', ') || 'なし' }),
      ],
      ctx.onJump
    )
  );

  container.appendChild(sectionCard('送り主', 'exporter', [partySummary(state.exporter)], ctx.onJump));
  container.appendChild(sectionCard('買主', 'buyer', [partySummary(state.buyer)], ctx.onJump));
  container.appendChild(
    sectionCard(
      '配送先',
      'shipTo',
      [
        state.shipToSameAsBuyer.value === true
          ? el('p', { text: '買主と同じ' })
          : state.shipToSameAsBuyer.status === FieldStatus.UNKNOWN
            ? el('p', { class: 'field-warning', text: 'まだ分からない（確認待ち）' })
            : partySummary(state.shipTo),
      ],
      ctx.onJump
    )
  );
  container.appendChild(
    sectionCard(
      '輸入者',
      'importer',
      [
        state.importerSameAsBuyer.value === true
          ? el('p', { text: '買主と同じ' })
          : state.importerSameAsBuyer.status === FieldStatus.UNKNOWN
            ? el('p', { class: 'field-warning', text: 'まだ分からない（自動的に買主と同一にはしていません）' })
            : partySummary(state.importer),
      ],
      ctx.onJump
    )
  );

  const itemsBody = (state.items || []).map((item, idx) =>
    el('p', {
      text: `${idx + 1}. ${v(item.descriptionEn) !== '（未入力）' ? v(item.descriptionEn) : v(item.name)} / 数量:${v(item.quantity)} ${v(item.unit)} / 単価:${v(item.unitPrice)} / 原産国:${v(item.originCountry)} / HS:${v(item.hsCode)}`,
    })
  );
  itemsBody.push(el('p', { text: `商品代小計: ${totals.subtotalStr} ${totals.currency}` }));
  itemsBody.push(el('p', { text: `追加費用合計: ${totals.chargesSumStr} ${totals.currency}${totals.freightIncludedInPrice ? '（運賃は商品価格に含まれているため二重計上していません）' : ''}` }));
  itemsBody.push(el('p', { class: 'total-line', text: `総額: ${totals.totalStr} ${totals.currency}` }));
  container.appendChild(sectionCard('商品一覧・金額', 'items', itemsBody, ctx.onJump));

  container.appendChild(
    sectionCard(
      '支払い・配送条件',
      'terms',
      [
        el('p', { text: `支払い条件: ${v(state.shipping.paymentTerms)}` }),
        el('p', { text: `Incoterms: ${v(state.shipping.incotermCode)} ${v(state.shipping.incotermPlace, '')}` }),
        el('p', { text: `配送費は商品価格に${state.shipping.freightIncludedInPrice.value === true ? '含まれています' : '含まれていません'}` }),
      ],
      ctx.onJump
    )
  );

  const unresolvedBody =
    checks.all.length === 0
      ? [el('p', { text: '未解決の項目はありません。' })]
      : checks.all.map((i) =>
          el('div', { class: 'unresolved-item' }, [
            el('span', { class: 'unresolved-badge unresolved-' + i.category, text: { format: '形式エラー', missing: '未入力', external: '要確認' }[i.category] }),
            el('span', { text: ' ' + i.message }),
            i.guidance ? el('p', { class: 'field-note', text: i.guidance }) : null,
            el('button', { type: 'button', class: 'link-btn', onclick: () => ctx.onJump(i.screenId) }, 'この質問へ戻る'),
          ])
        );
  container.appendChild(el('section', { class: 'review-card' }, [el('h3', { text: '未入力・未確認の項目' }), ...unresolvedBody]));

  container.appendChild(el('h3', { text: '出力される英語帳票' }));
  container.appendChild(el('p', { text: `${state.invoice.docType.value === 'proforma' ? 'PROFORMA INVOICE' : 'COMMERCIAL INVOICE'}${isDraft ? '（DRAFT表示付き）' : ''}` }));

  const actions = el('div', { class: 'review-actions' });
  actions.appendChild(el('button', { type: 'button', class: 'secondary-btn', onclick: () => ctx.onOpenPrint() }, 'A4印刷プレビューを開く'));
  actions.appendChild(
    el(
      'button',
      { type: 'button', class: 'primary-btn', onclick: () => ctx.onExportSheets(isDraft) },
      isDraft ? '下書きをスプレッドシートに保存' : 'Googleスプレッドシートを作成'
    )
  );
  container.appendChild(actions);

  return container;
}
