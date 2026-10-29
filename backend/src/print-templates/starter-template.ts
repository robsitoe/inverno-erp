import { PrintModule } from './template-engine';

/** Modelos base por módulo — ponto de partida para criar modelos próprios. */

const HEADER = `<table style="width:100%">
  <tr>
    <td style="width:50%;vertical-align:top">
      {{empresa.logo}}
      <div style="font-size:16px;font-weight:bold">{{empresa.nome}}</div>
      <div>{{empresa.morada}}</div>
      <div>NUIT: {{empresa.nif}} · Tel.: {{empresa.telefone}}</div>
      <div>{{empresa.email}} {{empresa.website}}</div>
    </td>
    <td style="width:50%;vertical-align:top;text-align:right">
      <div style="font-size:18px;font-weight:bold">{{documento.descricao}}</div>
      <div style="font-size:14px">N.º {{documento.numero}}</div>
      <div>{{documento.copia}}</div>
    </td>
  </tr>
</table>`;

const COMMERCIAL = (entityLabel: string, extra: string) => `${HEADER}

<table style="width:100%;margin-top:14px">
  <tr>
    <td style="width:55%;vertical-align:top;border:1px solid #ccc;padding:6px">
      <div style="color:#555">${entityLabel}</div>
      <div style="font-weight:bold">{{entidade.nome}}</div>
      <div>{{entidade.morada}}</div>
      <div>NUIT: {{entidade.nif}}</div>
    </td>
    <td style="width:45%;vertical-align:top;padding:6px 0 6px 12px">
      <div>Data: {{documento.data}}</div>
      <div>Vencimento: {{documento.vencimento}}</div>
      <div>Condição: {{documento.condicao}}</div>
      <div>Série: {{documento.serie}}</div>${extra}
    </td>
  </tr>
</table>

<table class="linhas" style="width:100%;margin-top:14px">
  <thead>
    <tr><th>Código</th><th>Descrição</th><th>Qtd.</th><th>Preço Unit.</th><th>Desc. %</th><th>IVA %</th><th>Total</th></tr>
  </thead>
  <tbody>
    {{#linhas}}
    <tr>
      <td>{{linha.codigo}}</td><td>{{linha.descricao}}</td>
      <td class="num">{{linha.quantidade}}</td><td class="num">{{linha.precoUnitario}}</td>
      <td class="num">{{linha.desconto}}</td><td class="num">{{linha.taxaIva}}</td><td class="num">{{linha.total}}</td>
    </tr>
    {{/linhas}}
  </tbody>
</table>

<table style="width:100%;margin-top:14px">
  <tr>
    <td style="width:55%;vertical-align:top">
      <table class="linhas" style="width:90%">
        <thead><tr><th>Taxa IVA</th><th>Incidência</th><th>Valor IVA</th></tr></thead>
        <tbody>
          {{#resumoIva}}<tr><td class="num">{{iva.taxa}}</td><td class="num">{{iva.base}}</td><td class="num">{{iva.valor}}</td></tr>{{/resumoIva}}
        </tbody>
      </table>
      <div style="margin-top:8px">{{documento.observacoes}}</div>
    </td>
    <td style="width:45%;vertical-align:top">
      <table style="width:100%">
        <tr><td>Mercadoria/Serviços</td><td class="num">{{totais.subtotal}}</td></tr>
        <tr><td>Descontos</td><td class="num">{{totais.descontos}}</td></tr>
        <tr><td>IVA</td><td class="num">{{totais.iva}}</td></tr>
        <tr class="total"><td>Total (MT)</td><td class="num">{{totais.total}}</td></tr>
      </table>
    </td>
  </tr>
</table>`;

const TREASURY = `${HEADER}

<table style="width:100%;margin-top:14px">
  <tr>
    <td style="width:55%;vertical-align:top;border:1px solid #ccc;padding:6px">
      <div style="color:#555">Entidade</div>
      <div style="font-weight:bold">{{entidade.nome}}</div>
    </td>
    <td style="width:45%;vertical-align:top;padding:6px 0 6px 12px">
      <div>Data: {{documento.data}}</div>
      <div>Meio de pagamento: {{documento.meioPagamento}}</div>
      <div>Referência: {{documento.referencia}}</div>
    </td>
  </tr>
</table>

<table class="linhas" style="width:100%;margin-top:14px">
  <thead>
    <tr><th>Documento</th><th>Descrição</th><th>Valor original</th><th>Desconto</th><th>Valor liquidado</th><th>Pendente</th></tr>
  </thead>
  <tbody>
    {{#linhas}}
    <tr>
      <td>{{linha.documento}}</td><td>{{linha.descricao}}</td>
      <td class="num">{{linha.valorOriginal}}</td><td class="num">{{linha.desconto}}</td>
      <td class="num">{{linha.total}}</td><td class="num">{{linha.pendente}}</td>
    </tr>
    {{/linhas}}
  </tbody>
</table>

<table style="width:100%;margin-top:14px">
  <tr>
    <td style="width:55%;vertical-align:top">{{documento.observacoes}}</td>
    <td style="width:45%;vertical-align:top">
      <table style="width:100%">
        <tr><td>Descontos</td><td class="num">{{totais.descontos}}</td></tr>
        <tr class="total"><td>Total (MT)</td><td class="num">{{totais.total}}</td></tr>
      </table>
    </td>
  </tr>
</table>

<table style="width:100%;margin-top:40px">
  <tr><td style="width:50%;text-align:center">________________________<br>Entregou</td><td style="width:50%;text-align:center">________________________<br>Recebeu</td></tr>
</table>`;

const STOCK = `${HEADER}

<table style="width:100%;margin-top:14px">
  <tr>
    <td style="vertical-align:top;padding:6px 0">
      <div>Data: {{documento.data}}</div>
      <div>Armazém: {{documento.armazem}}</div>
      <div>Série: {{documento.serie}}</div>
    </td>
  </tr>
</table>

<table class="linhas" style="width:100%;margin-top:14px">
  <thead>
    <tr><th>Código</th><th>Descrição</th><th>Unid.</th><th>Quantidade</th><th>Custo Unit.</th><th>Total</th></tr>
  </thead>
  <tbody>
    {{#linhas}}
    <tr>
      <td>{{linha.codigo}}</td><td>{{linha.descricao}}</td><td>{{linha.unidade}}</td>
      <td class="num">{{linha.quantidade}}</td><td class="num">{{linha.precoUnitario}}</td><td class="num">{{linha.total}}</td>
    </tr>
    {{/linhas}}
  </tbody>
</table>

<div style="margin-top:8px">{{documento.observacoes}}</div>

<table style="width:100%;margin-top:40px">
  <tr><td style="width:50%;text-align:center">________________________<br>Entregou</td><td style="width:50%;text-align:center">________________________<br>Recebeu</td></tr>
</table>`;

export const STARTER_CSS = `.linhas th { background: #f0f0f0; border-bottom: 1px solid #999; padding: 4px; text-align: left; }
.linhas td { border-bottom: 1px solid #e5e5e5; padding: 4px; }
.num { text-align: right; white-space: nowrap; }
.total td { font-size: 14px; font-weight: bold; border-top: 2px solid #111; padding-top: 4px; }`;

export function starterFor(module: PrintModule): { html: string; css: string } {
  const html = module === 'TREASURY' ? TREASURY
    : module === 'STOCK' ? STOCK
      : module === 'PURCHASES' ? COMMERCIAL('Fornecedor', '\n      <div>V/Ref.: {{documento.referencia}}</div>')
        : COMMERCIAL('Exmo.(s) Sr.(s)', '');
  return { html, css: STARTER_CSS };
}
