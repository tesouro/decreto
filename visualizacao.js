// captura referencias a elementos da página
const $grafico_container = d3.select('#anexos');
const $svgs     = $grafico_container.selectAll("svg");

// margem geral
const PAD = {
  x: 20,
  y: 35
}


// captures the container's width
// and uses it as the svg width
// -> learnt that with @codenberg
const w = $grafico_container.node().offsetWidth;
console.log("Largura do container: ", w);

// defines h and the number of itens in the rank
//  based on the width

const h = 200;
//const w_grafico = w < 400 ? w : 400;



// configures svg dimensions
$svgs      
  .attr('width', w)
  .attr('height', h);

// formatação valores
    
const localeBrasil = {
    "decimal": ",",
    "thousands": ".",
    "grouping": [3],
    "currency": ["R$", ""]};

const formataBR = d3.formatDefaultLocale(localeBrasil).format(",.0f");

const formata_vlr_tooltip = function(val){
    return "R$ "+formataBR(val/1e6)+" mi"
}

// function to process the data

d3.csv("orc_fin.csv").then(function(dados) {
    //console.table(dados);

    // lista orgaos
    const orgaos = d3.map(dados, d => d.cod_orgao + " - " + d.nom_orgao)
    const lista_unica_orgaos = d3.map(orgaos, d => d).keys();
    const meses = ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"]
    
    // popular os <select>

    const $menu_orgao = d3.select("#menu-orgao");
    const $menu_mes = d3.select("#menu-mes");

    const $menu_orgao_options = $menu_orgao
      .selectAll("option.js-populados")
      .data(lista_unica_orgaos)
      .enter()
      .append("option")
      .classed("js-populados", true)
      .property("value", d => d)
      .text(d => d);

    const $menu_mes_options = $menu_mes
      .selectAll("option.js-populados")
      .data(meses)
      .enter()
      .append("option")
      .classed("js-populados", true)
      .property("value", d => d)
      .text(d => d);

    //  funcao para desenhar o grafico
    // *******************************


    const draw_mes = function(cod_orgao, mes, anexo) {
      const dados_filtrados = dados.filter(
        d => d.cod_orgao == cod_orgao & 
             d.mes == mes &
             d.Anexo == anexo);

      //console.log("Tem dados?", dados_filtrados);

      // selecao do svg correto
      // para generalizar a função de desenhar o gráfico, e 
      // parametrizá-la conforme o anexo
      let svg_id;

      switch (anexo) {
        case "Anexo II":
          svg_id = "anexo2"
          break;
        case "Anexo III":
          svg_id = "anexo3"
          break;
        case "Anexo IV":
          svg_id = "anexo4"
          break;
      }
      //console.log("." + svg_id + " svg")

      const $svg = d3.select("." + svg_id + " svg");
      const $container = d3.select("." + svg_id + " .container-svg");

      $container.select("p.aviso").remove();

      const desenha = function() {

        const limite_nao_utilizado = +dados_filtrados[0].lim_pag - +dados_filtrados[0].pg_mes > 0 ?
                                    +dados_filtrados[0].lim_pag - +dados_filtrados[0].pg_mes :
                                    0;

        console.log(dados_filtrados, limite_nao_utilizado);

        // maximos
        const max_lim_pag = d3.max(dados_filtrados, d => +d.lim_pag);
        const max_pago_lim_sq = d3.max(dados_filtrados, d => +d.pg_mes + +d.lim_sq_sd);
        const max_pago_liq_pg = d3.max(dados_filtrados, d => +d.pg_mes + +d.liq_a_pg_sd);

        console.log("maximos", [max_lim_pag, max_pago_lim_sq, max_pago_liq_pg]);

        const max_geral = d3.max([max_lim_pag, max_pago_lim_sq, max_pago_liq_pg]);

        console.log(max_geral);

        // escala

        const scale_x = d3.scaleLinear()
          .domain([0, max_geral])
          .range([0, w-2*PAD.x]);

        const heights = 15;

        const parametros = [
          { 
            label: "Limite de pagamento",
            valor: formataBR(+dados_filtrados[0].lim_pag),
            x : PAD.x,
            y : PAD.y,
            width : scale_x(+dados_filtrados[0].lim_pag),
            height : heights,
            dashed : false
          },
          { 
            label: "Valor pago",
            valor: formataBR(+dados_filtrados[0].pg_mes),
            x : PAD.x,
            y : PAD.y * 2,
            width : scale_x(+dados_filtrados[0].pg_mes),
            height : heights,
            dashed : false
          },
          { 
            label: "Limite não utilizado",
            valor: formataBR(limite_nao_utilizado),
            x : PAD.x + scale_x(+dados_filtrados[0].pg_mes),
            y : PAD.y * 3,
            width : scale_x(limite_nao_utilizado),
            height : heights,
            dashed : true
          },
          { 
            label: "Limite de saque",
            valor: formataBR(+dados_filtrados[0].lim_sq_sd),
            x : PAD.x + scale_x(+dados_filtrados[0].pg_mes),
            y : PAD.y * 4,
            width : scale_x(+dados_filtrados[0].lim_sq_sd),
            height : heights,
            dashed : false 
          },
          { 
            label: "Obrigações a pagar",
            valor: formataBR(+dados_filtrados[0].liq_a_pg_sd),
            x : PAD.x + scale_x(+dados_filtrados[0].pg_mes),
            y : PAD.y * 5,
            width : scale_x(+dados_filtrados[0].liq_a_pg_sd),
            height : heights,
            dashed : false 
          }
        ];

        console.log("Parâmetros: ", parametros);

        console.log("Labels: ", parametros.map(d => d.label));


        const scale_cor = d3.scaleOrdinal()
          .domain(parametros.map(d => d.label))
          .range(["goldenrod", "dodgerblue", "transparent", "seagreen", "crimson"]);

        const scale_cor_texto = d3.scaleOrdinal()
          .domain(scale_cor.domain())
          .range(["darkgoldenrod", "dodgerblue", "dimgrey", "seagreen", "firebrick"]);

        // os rects

        const $rects = $svg.selectAll("rect").data(parametros);
        const $rects_enter = $rects
          .enter()
          .append("rect")
          .attr("x", d => d.x)
          .attr("y", d => d.y)
          .attr("height", heights)
          .attr("width", 0)
          .attr("fill", "transparent");
        
        $rects.exit().remove()

        const $rects_update = $rects.merge($rects_enter)
          .classed("dashed", d => d.dashed)
          .transition()
          .duration(750)
          .attr("x", d => d.x)
          .attr("y", d => d.y)
          .attr("width", d => d.width)
          .attr("height", d => d.height)
          .attr("fill", d => scale_cor(d.label));

        

        // os labels

        const $labels = $container.selectAll("p.label").data(parametros);
        const $labels_enter = $labels.enter().append("p");

        $labels.exit().remove();
        
        const $labels_update = $labels.merge($labels_enter)
          .style("top", d => `${d.y - 28}px`)
          .classed("label", true)
          .style("color", d => scale_cor_texto(d.label))
          .text(d => d.label + ": R$ " + d.valor)
          .transition()
          .duration(750)
          .style("left", d => `${d.x}px`); 
      }  

      // testar se existe dado para essa seleção
      if (dados_filtrados.length == 0) {
        // nesse caso não existe, então apaga os rects e labels,
        // e exibe uma mensagem
        $svg.selectAll("rect").remove()
        $container.selectAll("p.label").remove()
        $container.append("p")
          .text("Sem dados para este Anexo neste orgão.")
          .classed("aviso", true);
      } else {
        desenha();
      }

    }
      

    // interatividade, desenhar o gráfico conforme a seleção
    let orgao_selecionado, mes_selecionado;

    $menu_orgao.on("change", function() {
      const selecao = $menu_orgao.property("value");

      orgao_selecionado = selecao.substring(0, 5)      

      if (mes_selecionado) {
        console.log("Mudei o orgao", orgao_selecionado, mes_selecionado);
        draw_mes(orgao_selecionado, mes_selecionado, "Anexo II")
        draw_mes(orgao_selecionado, mes_selecionado, "Anexo III")
        draw_mes(orgao_selecionado, mes_selecionado, "Anexo IV")
      }
    })

    $menu_mes.on("change", function() {
      const selecao = $menu_mes.property("value");

      mes_selecionado = "" + (meses.indexOf(selecao)+1);
      console.log("mes", selecao, mes_selecionado);

      if (orgao_selecionado) {
        draw_mes(orgao_selecionado, mes_selecionado, "Anexo II")
        draw_mes(orgao_selecionado, mes_selecionado, "Anexo III")
        draw_mes(orgao_selecionado, mes_selecionado, "Anexo IV")
      }      
    })
    
    //draw_mes("20000", "2", "Anexo II")

    //console.log(lista_unica_orgaos);

})
