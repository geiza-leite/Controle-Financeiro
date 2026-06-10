// ===============================
// CONTROLE FINANCEIRO - SCRIPT JS
// ===============================
// ===============================
// FIREBASE
// ===============================

const firebaseConfig = {
  apiKey: "AIzaSyCvlhno3PWZfWk8OCr-nO-yBu-MsUjVuMs",
  authDomain: "controle-financeiro-58375.firebaseapp.com",
  databaseURL: "https://controle-financeiro-58375-default-rtdb.firebaseio.com",
  projectId: "controle-financeiro-58375",
  storageBucket: "controle-financeiro-58375.firebasestorage.app",
  messagingSenderId: "10990153679",
  appId: "1:10990153679:web:c8a848ca41482f5bb32cba"
};

firebase.initializeApp(firebaseConfig);

const database = firebase.database();

const auth = firebase.auth();

let usuarioLogado = null;

// ===============================
// CONFIGURAÇÕES
// ===============================

const STORAGE_KEYS = {

    BANCO: "banco",

};

const MESES = [

    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro"

];

const $ = (id) => document.getElementById(id);

const setText = (id, texto) => {

    let elemento = $(id);

    if(!elemento) return;

    elemento.innerText = texto;

};

// ===============================
// VARIÁVEIS GLOBAIS
// ===============================

let banco =
    JSON.parse(
        localStorage.getItem(
            STORAGE_KEYS.BANCO
        )
    ) || {};

let chaveAtual = "";

let grafico = null;




// ===============================
// CARREGAR ANOS
// ===============================

function carregarAnos() {

    let ano = $("ano");

    let atual = new Date().getFullYear();

    for (let i = atual - 2; i <= atual + 5; i++) {

        let option = document.createElement("option");

        option.value = i;
        option.text = i;

        ano.appendChild(option);
    }

    ano.value = atual;
}

carregarAnos();

// ===============================
// SALVAR
// ===============================

async function salvar() {

    localStorage.setItem(
        STORAGE_KEYS.BANCO,
        JSON.stringify(banco)
    );

    const user =
        firebase.auth().currentUser;

    if(!user) return;

    try {

        await database
        .ref(
            "controleFinanceiro/" +
            user.uid
        )
        .set(banco);

    } catch(error) {

        console.error(
            "Erro Firebase:",
            error
        );

    }

}
// ===============================
// GERAR CHAVE
// ===============================

function gerarChave() {

    let mes = $("mes").value;

    let ano = $("ano").value;

    return `${mes}-${ano}`;
}

// ===============================
// ABRIR MÊS
// ===============================

function carregarMes() {

    chaveAtual = gerarChave();

    if (!banco[chaveAtual]) {

        banco[chaveAtual] = {
            entradas: [],
            contas: [],
            categorias: []
        };

    } else {

        banco[chaveAtual].entradas =
            banco[chaveAtual].entradas || [];

        banco[chaveAtual].contas =
            banco[chaveAtual].contas || [];

        banco[chaveAtual].categorias =
            banco[chaveAtual].categorias || [];
    }

    renderizarTudo();

    fecharCardsMobile();
}

// ===============================
// COPIAR MÊS
// ===============================

function copiarMesAnterior() {



    let mesAtual =
        document.getElementById("mes").value;

    let anoAtual =
        Number(
            document.getElementById("ano").value
        );

   let indexAtual =
    MESES.indexOf(mesAtual);

    let mesAnterior =
    MESES[indexAtual - 1];

    let anoAnterior =
        anoAtual;

    if(indexAtual === 0){

        mesAnterior = "Dezembro";

        anoAnterior--;
    }

    let chaveAnterior =
        mesAnterior + "-" + anoAnterior;

    let chaveNova =
        mesAtual + "-" + anoAtual;

    if(!banco[chaveAnterior]){

        mostrarToast(
            "Mês anterior não encontrado"
        );

        return;
    }

    banco[chaveNova] = {

        entradas:
        banco[chaveAnterior]
        .entradas
        .map(e => ({

            nome: e.nome,
            valor: 0

        })),

        contas:
        banco[chaveAnterior]
        .contas
        .map(c => ({

            nome: c.nome,
            valor: 0,
            pago: false

        })),

        categorias:
        banco[chaveAnterior]
        .categorias
        .map(cat => ({

            nome: cat.nome,

            itens:
            cat.itens.map(i => ({

                nome: i.nome,
                valor: 0,
                pago: false

            }))

        }))

    };

    salvar();

    chaveAtual = chaveNova;

    renderizarTudo();

    mostrarToast(
        "📋 Mês copiado sem valores"
    );
}

// ===============================
// CRIAR LINHA
// ===============================

function criarLinha(tipo) {

    let div =
        document.createElement("div");

    div.className = "linha";

    let checkbox = "";

    if(tipo !== "entradas"){

        checkbox = `

        <input
        type="checkbox"
        class="check-pago"
        onchange="calcular()"
        >

        `;
    }

    div.innerHTML = `

    <input
    type="text"
    placeholder="Descrição"
    >

    <input
    type="text"
    class="valor"
    placeholder="0,00"
    oninput="formatarMoeda(this)"
    >

    ${checkbox}

    <button onclick="removerLinha(this)">
    ✕
    </button>

    `;

    return div;
}

// ===============================
// ADICIONAR ITEM
// ===============================

function addItem(tipo) {

    let container = $(tipo);

    let linha = criarLinha(tipo);

    container.appendChild(linha);

    calcular();
}

// ===============================
// REMOVER LINHA
// ===============================

function removerLinha(botao) {

    botao.parentElement.remove();

    calcular();
}

// ===============================
// FORMATAR MOEDA
// ===============================

function formatarMoeda(input) {

    let valor = input.value;

    valor = valor.replace(/\D/g, "");

    valor =
        (Number(valor) / 100)
        .toFixed(2);

    valor =
        valor.replace(".", ",");

    valor =
        valor.replace(
            /\B(?=(\d{3})+(?!\d))/g,
            "."
        );

    input.value = valor;

    setTimeout(() => {

        calcular();

    },0);
}

// ===============================
// CONVERTER VALOR
// ===============================

function converterValor(valor){

    if(!valor) return 0;

    valor = valor
    .replace(/\./g,"")
    .replace(",", ".");

    return Number(valor);
}

// ===============================
// FORMATAR NUMERO
// ===============================

function formatarNumero(valor){

    return valor.toLocaleString(

        "pt-BR",

        {

            minimumFractionDigits:2,
            maximumFractionDigits:2

        }
    );
}

// ===============================
// SOMAR CONTAINER
// ===============================

function somaContainer(id){

    let container = $(id);

    if(!container) return 0;

    let inputs =
        container.querySelectorAll(".valor");

    let total = 0;

    inputs.forEach(input => {

        total += converterValor(
            input.value
        );

    });

    return total;
}

// ===============================
// NOVA CATEGORIA
// ===============================

function novaCategoria(){

    if(!chaveAtual){

        mostrarToast(
            "Abra um mês primeiro"
        );

        return;
    }

    let input =
        document.getElementById(
            "nomeCategoria"
        );

    let nome =
        input.value.trim();

    if(nome === "") return;

    banco[chaveAtual]
    .categorias
    .push({

        nome:nome,
        itens:[]

    });

    input.value = "";

    salvar();

    renderizarTudo();
}

// ===============================
// EDITAR CATEGORIA
// ===============================

function editarCategoria(index, valor){

    banco[chaveAtual]
    .categorias[index]
    .nome = valor;

    salvar();
}

// ===============================
// REMOVER CATEGORIA
// ===============================

function removerCategoria(index){

    banco[chaveAtual]
    .categorias
    .splice(index,1);

    salvar();

    renderizarTudo();
}

// ===============================
// ADD ITEM CATEGORIA
// ===============================

function addItemCategoria(index){

    let container =
        document.getElementById(
            `cat-${index}`
        );

    let linha =
        criarLinha("categoria");

    container.appendChild(linha);

    calcular();
}

// ===============================
// PEGAR DADOS
// ===============================

function pegarDados(id){

    let linhas =
        document.querySelectorAll(
            `#${id} .linha`
        );

    let dados = [];

    linhas.forEach(linha => {

        dados.push({

            nome:
            linha.children[0].value,

            valor:
            converterValor(
                linha.children[1].value
            ),

            pago:
            linha.querySelector(
                ".check-pago"
            )?.checked || false

        });

    });

    return dados;
}

// ===============================
// SALVAR DADOS
// ===============================



function salvarDados(){

    if(!chaveAtual) return;

    banco[chaveAtual].entradas =
        pegarDados("entradas");

    banco[chaveAtual].contas =
        pegarDados("contas");

    banco[chaveAtual]
    .categorias
    .forEach((cat,index)=>{

        cat.itens =
            pegarDados(
                `cat-${index}`
            );

    });

    salvar();
}

// ===============================
// CALCULAR
// ===============================

function calcular(){

    if(!chaveAtual) return;

    let entradas =
        somaContainer("entradas");

    let contas =
        somaContainer("contas");

    let categoriasTotal = 0;

    banco[chaveAtual]
    .categorias
    .forEach((cat,index)=>{

        let total =
            somaContainer(
                `cat-${index}`
            );

        categoriasTotal += total;

        let span =
            document.getElementById(
                `total-cat-${index}`
            );

        if(span){

            span.innerText =
                formatarNumero(total);
        }

    });

    let despesas =
        contas + categoriasTotal;

    let saldo =
        entradas - despesas;

    setText(
    "totalEntradas",
    formatarNumero(entradas)
);

setText(
    "totalContas",
    formatarNumero(contas)
);

    // =========================
    // FALTA PAGAR
    // =========================

    let faltante = despesas;

    document
    .querySelectorAll(
        ".check-pago"
    )
    .forEach(check => {

        if(check.checked){

            let linha =
                check.parentElement;

            let valor =
                converterValor(
                    linha.children[1].value
                );

            faltante -= valor;
        }

    });

    // =========================
    // DASHBOARD
    // =========================

    setText(
    "cardEntradas",
    `R$ ${formatarNumero(entradas)}`
);

setText(
    "cardDespesas",
    `R$ ${formatarNumero(despesas)}`
);

setText(
    "cardFaltante",
    `R$ ${formatarNumero(faltante)}`
);

setText(
    "cardSaldo",
    `R$ ${formatarNumero(saldo)}`
);

    salvarDados();

    atualizarGrafico(

        contas,

        categoriasTotal
    );
}

// ===============================
// RENDERIZAR CATEGORIAS
// ===============================

function renderizarCategorias(){

    let area =
        document.getElementById(
            "categorias"
        );

    area.innerHTML = "";

    banco[chaveAtual]
    .categorias
    .forEach((cat,index)=>{

        let card =
            document.createElement("div");

        card.className = "card";

        card.innerHTML = `

       <div class="titulo-card">

    <div class="titulo-categoria-mobile">

    <input
    class="titulo-editavel"
    value="${cat.nome}"
    onchange="
    editarCategoria(
        ${index},
        this.value
    )
    "
    >

</div>

    <div class="titulo-acoes">

    <button
type="button"
class="btn-seta-cat"
onclick="
event.stopPropagation();
alternarCategoria(${index});
"
id="seta-cat-${index}">
    ▼
</button>

    
<button
onclick="
event.stopPropagation();
addItemCategoria(
    ${index}
)
"
>
+
</button>

<button
onclick="
event.stopPropagation();
removerCategoria(
    ${index}
)
"
>
✕
</button>

            </div>

        </div>

        <div id="cat-${index}" class="conteudo-recolhivel">
</div>

        <div class="total-card">

            Total: R$

            <span id="total-cat-${index}">
            0,00
            </span>

        </div>

        `;

        area.appendChild(card);

        let container =
            document.getElementById(
                `cat-${index}`
            );

        (cat.itens || []).forEach(item => {

            let linha =
                criarLinha("categoria");

            linha.children[0].value =
                item.nome;

            linha.children[1].value =
                formatarNumero(
                    item.valor
                );

            linha.querySelector(
                ".check-pago"
            ).checked =
                item.pago || false;

            container.appendChild(linha);

        });

    });

    calcular();
}

// ===============================
// RENDERIZAR TUDO
// ===============================

function renderizarTudo(){

    document.getElementById(
        "entradas"
    ).innerHTML = "";

    document.getElementById(
        "contas"
    ).innerHTML = "";

    banco[chaveAtual]
    .entradas
    .forEach(item => {

        let linha =
            criarLinha("entradas");

        linha.children[0].value =
            item.nome;

        linha.children[1].value =
            formatarNumero(
                item.valor
            );

        $("entradas")
.appendChild(linha);

    });

    banco[chaveAtual]
    .contas
    .forEach(item => {

        let linha =
            criarLinha("contas");

        linha.children[0].value =
            item.nome;

        linha.children[1].value =
            formatarNumero(
                item.valor
            );

        linha.querySelector(
            ".check-pago"
        ).checked =
            item.pago || false;

        document
        .getElementById("contas")
        .appendChild(linha);

    });

    renderizarCategorias();

    calcular();
}

// ===============================
// GRAFICO
// ===============================

function atualizarGrafico(
    contas,
    categorias
){

    let ctx =
        document.getElementById(
            "grafico"
        );

    if(grafico){

        grafico.destroy();
    }

    grafico = new Chart(ctx, {

        type:"doughnut",

        data:{

            labels:[

                "Contas Fixas",
                "Categorias"

            ],

            datasets:[{

                data:[

                    contas,
                    categorias

                ]

            }]
        },

        options:{

            responsive:true,

            maintainAspectRatio:false
        }

    });
}

// ===============================
// ABRIR AUTOMATICAMENTE
// ===============================

auth.onAuthStateChanged(async (user) => {

    if(user){

        usuarioLogado = user;

        try {

            const snapshot =
                await database
                .ref(
                    "controleFinanceiro/" +
                    user.uid
                )
                .once("value");

            banco =
                snapshot.val() || {};

            localStorage.setItem(
                STORAGE_KEYS.BANCO,
                JSON.stringify(banco)
            );

        } catch(error){

            console.error(
                "Erro ao carregar Firebase:",
                error
            );
        }

        $("telaLogin").style.display =
            "none";

        $("app").style.display =
            "block";

        carregarMes();

        let emailUsuario =
            user.email || "";

        let nomeUsuario =
            emailUsuario
            .split("@")[0]
            .replaceAll(".", " ")
            .replaceAll("_", " ");

        let nomeFormatado =
            nomeUsuario
            .split(" ")
            .filter(parte => parte.trim() !== "")
            .map(parte =>
                parte.charAt(0).toUpperCase() +
                parte.slice(1)
            )
            .join(" ");

        $("usuarioAtual").innerText =
            nomeFormatado || emailUsuario;

    } else {

        usuarioLogado = null;

        banco = {};

        localStorage.removeItem(
            STORAGE_KEYS.BANCO
        );

        $("telaLogin").style.display =
            "flex";

        $("app").style.display =
            "none";
    }

});


// ===============================
// TOAST
// ===============================



function mostrarToast(mensagem){

    let toast =
        document.getElementById("toast");

    toast.innerText = mensagem;

    toast.classList.add("show");

    setTimeout(()=>{

        toast.classList.remove("show");

    },3000);
}



// ===============================
// LIMPAR MÊS
// ===============================

function limparMesAtual(){

    document
    .getElementById(
        "modalConfirmacao"
    )
    .style.display = "flex";
}

// ===============================
// FECHAR MODAL
// ===============================

function fecharModal(){

    document
    .getElementById(
        "modalConfirmacao"
    )
    .style.display = "none";
}

// ===============================
// CONFIRMAR LIMPEZA
// ===============================

function confirmarLimpeza(){

    banco[chaveAtual] = {

        entradas: [],
        contas: [],
        categorias: []

    };

    salvar();

    renderizarTudo();

    fecharModal();

    mostrarToast(
        "🗑️ Mês limpo com sucesso"
    );
}

// ===============================
// GERAR PDF
// ===============================

async function gerarPDF(){

    const { jsPDF } = window.jspdf;

    let pdf = new jsPDF();

    const agora = new Date().toLocaleString("pt-BR");

    let entradas =
        somaContainer("entradas");

    let contas =
        somaContainer("contas");

    let categoriasTotal = 0;

    banco[chaveAtual]
    .categorias
    .forEach((cat,index)=>{

        categoriasTotal +=
            somaContainer(
                `cat-${index}`
            );

    });

    let despesas =
        contas + categoriasTotal;

    let saldo =
        entradas - despesas;

    let faltante = despesas;

    document
    .querySelectorAll(".check-pago")
    .forEach(check => {

        if(check.checked){

            let linha =
                check.parentElement;

            let valor =
                converterValor(
                    linha.children[1].value
                );

            faltante -= valor;
        }

    });

    // =========================
    // TITULO
    // =========================

   // FUNDO DO TOPO

pdf.setFillColor(25, 35, 55);

pdf.rect(
    0,
    0,
    210,
    35,
    "F"
);

// TITULO

pdf.setTextColor(255,255,255);

pdf.setFontSize(24);

pdf.text(
    "CONTROLE FINANCEIRO",
    20,
    18
);

// NOME EMPRESA

pdf.setFontSize(13);

pdf.setTextColor(230,230,230);

pdf.text(
    usuarioLogado?.email || "Usuário",
    20,
    26
);

// RELATÓRIO

pdf.setFontSize(10);

pdf.setTextColor(220,220,220);

pdf.text(
    `Relatório: ${chaveAtual}`,
    185,
    20,
    { align: "right" }
);

pdf.setFontSize(8);

pdf.setTextColor(180,180,180);

pdf.text(
    `Gerado em: ${agora}`,
    185,
    27,
    { align: "right" }
);

let y = 60;

function novaPaginaSePrecisar() {
    if (y > 270) {
        pdf.addPage();
        y = 20;
    }
}



    // =========================
    // RESUMO
    // =========================

   // CARD RESUMO

pdf.setFillColor(240,240,240);

pdf.roundedRect(
    15,
    y - 5,
    180,
    50,
    4,
    4,
    "F"
);

pdf.setTextColor(0,0,0);

pdf.setFontSize(18);

pdf.text(
    "Resumo Financeiro",
    20,
    y + 5
);

y += 15;

    pdf.setFontSize(12);

  pdf.text(
    `Entradas: R$ ${formatarNumero(entradas)}`,
    25,
    y
);

y += 8;

pdf.text(
    `Despesas: R$ ${formatarNumero(despesas)}`,
    25,
    y
);

y += 8;

pdf.text(
    `Falta pagar: R$ ${formatarNumero(faltante)}`,
    25,
    y
);

y += 8;

// COR DO SALDO

if(saldo >= 0){

    pdf.setTextColor(0,150,0);

}else{

    pdf.setTextColor(200,0,0);
}

pdf.text(
    `Saldo: R$ ${formatarNumero(saldo)}`,
    25,
    y
);

// VOLTA COR NORMAL

pdf.setTextColor(0,0,0);
    // =========================
    // SALVAR
    // =========================
// =========================
// ENTRADAS
// =========================

y += 20;

pdf.setFontSize(18);

pdf.text(
    "Entradas",
    20,
    y
);

y += 10;

pdf.setFontSize(11);

// CABEÇALHO

pdf.setFillColor(40,40,40);

pdf.rect(
    20,
    y - 6,
    170,
    8,
    "F"
);

pdf.setTextColor(255,255,255);

pdf.text("Descrição", 25, y);

pdf.text("Valor", 150, y);

y += 10;

pdf.setTextColor(0,0,0);

// LINHAS

banco[chaveAtual]
.entradas
.forEach(entrada => {

    pdf.setFillColor(245,245,245);

    pdf.rect(
        20,
        y - 5,
        170,
        8,
        "F"
    );

    pdf.text(
        entrada.nome,
        25,
        y
    );

    pdf.text(
        `R$ ${formatarNumero(entrada.valor)}`,
        150,
        y
    );

    y += 10;

    if(y > 270){

        pdf.addPage();

        y = 20;
    }

});

    // =========================
// CONTAS FIXAS
// =========================

y += 20;

pdf.setFontSize(18);

pdf.text(
    "Contas Fixas",
    20,
    y
);

y += 10;

novaPaginaSePrecisar();

pdf.setFontSize(11);

// CABEÇALHO

pdf.setFillColor(40,40,40);

pdf.rect(
    20,
    y - 6,
    170,
    8,
    "F"
);

pdf.setTextColor(255,255,255);

pdf.text("Descrição", 25, y);

pdf.text("Valor", 150, y);

pdf.text("Status", 172, y);

y += 10;

pdf.setTextColor(0,0,0);

// LINHAS

banco[chaveAtual]
.contas
.forEach(conta => {

    pdf.setFillColor(245,245,245);

    pdf.rect(
        20,
        y - 5,
        170,
        8,
        "F"
    );

    pdf.text(
        conta.nome,
        25,
        y
    );

    pdf.text(
        `R$ ${formatarNumero(conta.valor)}`,
        150,
        y
    );

   if (conta.pago) {

    pdf.setFillColor(0, 180, 0);
    pdf.circle(180, y - 1.5, 1.2, "F");

} else {

    pdf.setFillColor(220, 0, 0);
    pdf.circle(180, y - 1.5, 1.2, "F");

}

pdf.setTextColor(0,0,0);

pdf.setTextColor(0,0,0);

    y += 10;

    // NOVA PAGINA

    if(y > 270){

        pdf.addPage();

        y = 20;
    }

});

// =========================
// CATEGORIAS
// =========================

banco[chaveAtual]
.categorias
.forEach(cat => {

    y += 15;

    // TITULO DA CATEGORIA

    pdf.setFillColor(25,35,55);

    pdf.roundedRect(
        20,
        y - 6,
        170,
        10,
        3,
        3,
        "F"
    );

    pdf.setTextColor(255,255,255);

    pdf.setFontSize(14);

    pdf.text(
        cat.nome,
        25,
        y
    );

    y += 12;

    // CABEÇALHO

    pdf.setFillColor(70,70,70);

    pdf.rect(
        20,
        y - 6,
        170,
        8,
        "F"
    );

    pdf.setFontSize(11);

    pdf.text(
        "Descrição",
        25,
        y
    );

    pdf.text(
        "Valor",
        150,
        y
    );

    y += 10;

    pdf.setTextColor(0,0,0);

    // ITENS

  cat.itens.forEach(item => {

    pdf.setFillColor(245,245,245);

    pdf.rect(
        20,
        y - 5,
        170,
        8,
        "F"
    );

    pdf.text(
        item.nome,
        25,
        y
    );

    pdf.text(
        `R$ ${formatarNumero(item.valor)}`,
        150,
        y
    );

    // =========================
    // STATUS (PAGO / PENDENTE)
    // =========================

 if (item.pago) {

    pdf.setFillColor(0, 180, 0); // verde
    pdf.circle(180, y - 2, 1.2, "F");

} else {

    pdf.setFillColor(220, 0, 0); // vermelho
    pdf.circle(180, y - 2, 1.2, "F");

}

    pdf.setTextColor(0,0,0);

    y += 10;

    if (y > 270) {

        pdf.addPage();
        y = 20;
    }

});

});

const totalPaginas = pdf.internal.getNumberOfPages();

for (let i = 1; i <= totalPaginas; i++) {
    pdf.setPage(i);

    pdf.setFontSize(9);
    pdf.setTextColor(150);


    pdf.text(
        "Sistema de Controle Financeiro",
        105,
        285,
        { align: "center" }
    );

    pdf.text(
        `Página ${i} de ${totalPaginas}`,
        105,
        291,
        { align: "center" }
    );
}

    pdf.save(
        `controle-financeiro-${chaveAtual}.pdf`
    );

    mostrarToast(
        "📄 PDF gerado"
    );
}

// ===============================
// EXPORTAR BACKUP
// ===============================

function exportarBackup(){

    let dados =
        JSON.stringify(
            banco,
            null,
            2
        );

    let blob =
        new Blob(
            [dados],
            {
                type:"application/json"
            }
        );

    let link =
        document.createElement("a");

    link.href =
        URL.createObjectURL(blob);

    link.download =
        "controle-financeiro.json";

    link.click();

    mostrarToast(
        "✅ Backup exportado"
    );
}

// ===============================
// IMPORTAR BACKUP
// ===============================

function importarBackup(event){

    let arquivo =
        event.target.files[0];

    if(!arquivo) return;

    let leitor =
        new FileReader();

    leitor.onload = function(e){

        try{

            banco =
                JSON.parse(
                    e.target.result
                );

            salvar();

            carregarMes();

            mostrarToast(
                "✅ Backup importado"
            );

        }catch{

            mostrarToast(
                "❌ Arquivo inválido"
            );
        }
    };

    leitor.readAsText(arquivo);
}

// ===============================
// LOGIN
// ===============================

async function cadastrar(){

    let email =
        $("email").value;

    let senha =
        $("senha").value;

    try{

        await auth
        .createUserWithEmailAndPassword(
            email,
            senha
        );

        mostrarToast(
            "✅ Cadastro realizado"
        );

    } catch(error){

        mostrarToast(
            error.message
        );

    }
}

// ===============================
// ENTRAR
// ===============================

async function login(){

    let email =
        $("email").value;

    let senha =
        $("senha").value;

    try{

        await auth
        .signInWithEmailAndPassword(
            email,
            senha
        );

        mostrarToast(
            "✅ Login realizado"
        );

    } catch(error){

        mostrarToast(
            error.message
        );

    }
}

// ===============================
// RECUPERAR SENHA
// ===============================

async function recuperarSenha(){

    let email =
        $("email").value;

    if(!email){

        mostrarToast(
            "Digite seu e-mail"
        );

        return;
    }

    try{

        await auth
        .sendPasswordResetEmail(
            email
        );

        mostrarToast(
            "📧 E-mail enviado"
        );

    } catch(error){

        mostrarToast(
            error.message
        );

    }
}

// ===============================
// LOGOUT
// ===============================

async function logout(){

    await auth.signOut();

    banco = {};

    localStorage.removeItem(
        STORAGE_KEYS.BANCO
    );

    $("usuarioAtual").innerText = "";

    mostrarToast(
        "👋 Logout realizado"
    );
}
function abrirFecharMenu(){

    let menu =
        document.getElementById(
            "menuAcoes"
        );

    menu.classList.toggle(
        "show"
    );
}
document.addEventListener(
    "click",
    function(event){

        let menu =
            document.getElementById(
                "menuAcoes"
            );

        let botao =
            document.querySelector(
                ".btn-menu"
            );

        if(
            !menu.contains(event.target)
            &&
            !botao.contains(event.target)
        ){

            menu.classList.remove(
                "show"
            );
        }
    }
);

function alternarCard(id){



    let conteudo =
        document.getElementById(id);

    if(!conteudo) return;

    conteudo.classList.toggle(
        "fechado"
    );

    let fechado =
        conteudo.classList.contains(
            "fechado"
        );

    if(id === "entradas"){

        document.getElementById(
            "seta-entradas"
        ).innerText =
            fechado ? "▼" : "▲";
    }

    if(id === "contas"){

        document.getElementById(
            "seta-contas"
        ).innerText =
            fechado ? "▼" : "▲";
    }
}

function fecharCardsMobile(){

    if(window.innerWidth <= 768){

        document
        .getElementById("entradas")
        ?.classList.add("fechado");

        document
        .getElementById("contas")
        ?.classList.add("fechado");

        document.getElementById(
    "seta-entradas"
).innerText = "▼";

document.getElementById(
    "seta-contas"
).innerText = "▼";

        document
        .querySelectorAll("[id^='cat-']")
        .forEach(categoria => {

            categoria.classList.add("fechado");

        });
    }
}
function alternarCategoria(index){


    let conteudo =
        document.getElementById(
            `cat-${index}`
        );

    if(!conteudo) return;

    conteudo.classList.toggle(
        "fechado"
    );

    let fechado =
        conteudo.classList.contains(
            "fechado"
        );

    document.getElementById(
        `seta-cat-${index}`
    ).innerText =
        fechado ? "▼" : "▲";
}