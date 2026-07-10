
const formulario = document.getElementById('transaction-form');
const inputDescricao = document.getElementById('input-description');
const inputValor = document.getElementById('input-amount');
const inputTipo = document.getElementById('input-type');
const inputCategoria = document.getElementById('input-category');
const inputData = document.getElementById('input-date');

const elTotalReceita = document.getElementById('total-income');
const elTotalDespesa = document.getElementById('total-expense');
const elTotalSaldo = document.getElementById('total-balance');

// --- Elementos do Histórico ---
const elListaTransacoes = document.getElementById('transaction-list');
const elListaVazia = document.getElementById('list-empty');

// --- Elementos de Filtro ---
const inputBusca = document.getElementById('filter-search');
const selectFiltroTipo = document.getElementById('filter-type');

// --- Gráfico ---
const elGrafico = document.getElementById('expense-chart');
const elGraficoVazio = document.getElementById('chart-empty');

// --- Toast (notificação) ---
const elToast = document.getElementById('toast');


const categorias = {
  // Categorias para DESPESAS
  expense: {
    alimentacao:  { icone: '🍔', nome: 'Alimentação', cor: '#ff9f43' },
    transporte:   { icone: '🚗', nome: 'Transporte',  cor: '#5ce1e6' },
    moradia:      { icone: '🏠', nome: 'Moradia',     cor: '#7c5cfc' },
    lazer:        { icone: '🎮', nome: 'Lazer',       cor: '#ff6b9d' },
    saude:        { icone: '🏥', nome: 'Saúde',       cor: '#00e5a0' },
    educacao:     { icone: '📚', nome: 'Educação',    cor: '#4ecdc4' },
    compras:      { icone: '🛒', nome: 'Compras',     cor: '#ffd93d' },
    contas:       { icone: '📄', nome: 'Contas',      cor: '#a0a0b0' },
    outros:       { icone: '📌', nome: 'Outros',      cor: '#8888a0' }
  },
  // Categorias para RECEITAS
  income: {
    salario:       { icone: '💼', nome: 'Salário',       cor: '#00e5a0' },
    freelance:     { icone: '💻', nome: 'Freelance',     cor: '#5ce1e6' },
    investimentos: { icone: '📊', nome: 'Investimentos', cor: '#7c5cfc' },
    presente:      { icone: '🎁', nome: 'Presente',      cor: '#ff6b9d' },
    outros:        { icone: '📌', nome: 'Outros',        cor: '#8888a0' }
  }
};


let transacoes = carregarDoLocalStorage();

// Variável para guardar a instância do gráfico.
// Precisamos dela para poder atualizar/destruir o gráfico.
let grafico = null;


function inicializar() {

  inputData.value = new Date().toISOString().split('T')[0];

  atualizarCategorias();

  atualizarTudo();

  configurarEventos();
}


function configurarEventos() {

  formulario.addEventListener('submit', function (e) {
    e.preventDefault(); // Impede recarregar a página
    adicionarTransacao();
  });

  // Quando o tipo mudar (receita ↔ despesa), atualiza as categorias
  inputTipo.addEventListener('change', atualizarCategorias);

  // Quando digitar na busca ou mudar o filtro, filtra a lista
  inputBusca.addEventListener('input', renderizarLista);
  selectFiltroTipo.addEventListener('change', renderizarLista);
}


function atualizarCategorias() {
  // Pega o tipo selecionado ('income' ou 'expense')
  const tipo = inputTipo.value;

  // Pega as categorias correspondentes ao tipo
  const cats = categorias[tipo];

  // Limpa todas as opções atuais do select
  inputCategoria.innerHTML = '';

  Object.entries(cats).forEach(function ([chave, info]) {
    // Cria um novo elemento <option>
    const option = document.createElement('option');
    option.value = chave;  // valor que o JS recebe (ex: "alimentacao")
    option.textContent = info.icone + ' ' + info.nome;  // texto visível (ex: "🍔 Alimentação")

    // Adiciona a option ao select
    inputCategoria.appendChild(option);
  });
}


function adicionarTransacao() {
  // .value pega o texto digitado no input
  // .trim() remove espaços em branco do início e do fim
  const descricao = inputDescricao.value.trim();

  // parseFloat converte texto para número decimal
  // "150.50" (string) → 150.50 (number)
  const valor = parseFloat(inputValor.value);

  const tipo = inputTipo.value;
  const categoria = inputCategoria.value;
  const data = inputData.value;

  // Validação: se algum campo estiver vazio, não faz nada
  if (!descricao || !valor || !data) {
    mostrarToast('Preencha todos os campos!', 'error');
    return; // "return" para a execução da função aqui
  }

  // Cria o OBJETO da transação
  // Date.now() gera um número único baseado no horário atual (serve como ID)
  const transacao = {
    id: Date.now(),
    descricao: descricao,
    valor: valor,
    tipo: tipo,         // 'income' ou 'expense'
    categoria: categoria, // 'alimentacao', 'salario', etc.
    data: data           // '2024-01-15'
  };

  // .push() adiciona um item ao FINAL do array
  transacoes.push(transacao);

  // Salva a lista atualizada no localStorage
  salvarNoLocalStorage();

  // Atualiza tudo na tela (cards, lista, gráfico)
  atualizarTudo();

  // Limpa o formulário para uma nova transação
  formulario.reset();  // .reset() limpa todos os inputs do formulário
  inputData.value = new Date().toISOString().split('T')[0]; // Redefine a data
  atualizarCategorias(); // Redefine as categorias

  // Mostra notificação de sucesso
  mostrarToast('✅ Transação adicionada!', 'success');
}


function deletarTransacao(id) {
  // Cria um novo array sem a transação com o ID especificado
  transacoes = transacoes.filter(function (t) {
    return t.id !== id;
  });

  salvarNoLocalStorage();
  atualizarTudo();
  mostrarToast('🗑️ Transação removida', 'error');
}



function atualizarTudo() {
  calcularEExibirTotais();
  renderizarLista();
  renderizarGrafico();
}



function calcularEExibirTotais() {
  // Filtra só as transações de receita e soma os valores
  const totalReceita = transacoes
    .filter(function (t) { return t.tipo === 'income'; })
    .reduce(function (soma, t) { return soma + t.valor; }, 0);
  // O 0 no final é o valor inicial da soma

  // Filtra só as transações de despesa e soma os valores
  const totalDespesa = transacoes
    .filter(function (t) { return t.tipo === 'expense'; })
    .reduce(function (soma, t) { return soma + t.valor; }, 0);

  // Saldo = o que entrou - o que saiu
  const saldo = totalReceita - totalDespesa;

  // Atualiza os textos dos cards na tela
  elTotalReceita.textContent = formatarMoeda(totalReceita);
  elTotalDespesa.textContent = formatarMoeda(totalDespesa);
  elTotalSaldo.textContent = formatarMoeda(saldo);

  // Muda a cor do saldo: verde se positivo, vermelho se negativo
  if (saldo >= 0) {
    elTotalSaldo.style.color = 'var(--cor-saldo)';
  } else {
    elTotalSaldo.style.color = 'var(--cor-despesa)';
  }

  // Adiciona animação de "pulso" para indicar que o valor mudou
  // Primeiro remove a classe (caso já tenha), depois adiciona de novo
  [elTotalReceita, elTotalDespesa, elTotalSaldo].forEach(function (el) {
    el.classList.remove('value-updated');
    // setTimeout com 10ms é um "truque" para reiniciar a animação CSS
    setTimeout(function () {
      el.classList.add('value-updated');
    }, 10);
  });
}



function renderizarLista() {
  // --- Aplicar filtros ---
  const textoBusca = inputBusca.value.toLowerCase(); // Converte para minúsculo
  const filtroTipo = selectFiltroTipo.value;

  // Filtra as transações baseado na busca e no tipo
  const transacoesFiltradas = transacoes.filter(function (t) {
    // Verifica se a descrição contém o texto buscado
    // .includes() verifica se uma string contém outra
    const passouBusca = t.descricao.toLowerCase().includes(textoBusca);

    // Verifica se o tipo corresponde ao filtro (ou se é "all")
    const passouTipo = filtroTipo === 'all' || t.tipo === filtroTipo;

    // Só inclui se passou nos dois filtros
    return passouBusca && passouTipo;
  });

  // --- Limpar a lista atual ---
  elListaTransacoes.innerHTML = '';

  // --- Se não há transações, mostra mensagem de "vazio" ---
  if (transacoesFiltradas.length === 0) {
    const divVazia = document.createElement('div');
    divVazia.className = 'empty-state';

    if (transacoes.length === 0) {
      // Não tem nenhuma transação
      divVazia.innerHTML =
        '<span class="empty-icon">📝</span>' +
        '<p>Nenhuma transação ainda</p>' +
        '<p class="empty-hint">Use o formulário ao lado para adicionar!</p>';
    } else {
      // Tem transações, mas o filtro não encontrou nada
      divVazia.innerHTML =
        '<span class="empty-icon">🔍</span>' +
        '<p>Nenhum resultado encontrado</p>' +
        '<p class="empty-hint">Tente buscar com outros termos</p>';
    }

    elListaTransacoes.appendChild(divVazia);
    return;
  }

  // --- Ordena por data (mais recente primeiro) ---
  // .sort() ordena o array. Retornar negativo = b vem antes de a
  // Comparamos as datas como strings (funciona porque o formato é YYYY-MM-DD)
  const ordenadas = transacoesFiltradas.sort(function (a, b) {
    return b.data.localeCompare(a.data);
  });

  // --- Cria o HTML de cada transação ---
  ordenadas.forEach(function (t) {
    // Pega as informações da categoria (ícone, nome)
    const infoCat = categorias[t.tipo][t.categoria];

    // Cria o elemento div para a transação
    const item = document.createElement('div');
    item.className = 'transaction-item ' + t.tipo;

    // Define o HTML interno do item
    // Template com strings normais (concatenação)
    item.innerHTML =
      '<div class="transaction-icon">' +
        (infoCat ? infoCat.icone : '📌') +
      '</div>' +
      '<div class="transaction-info">' +
        '<div class="transaction-description">' + t.descricao + '</div>' +
        '<div class="transaction-meta">' +
          '<span>' + formatarData(t.data) + '</span>' +
          '<span class="transaction-category">' +
            (infoCat ? infoCat.nome : 'Outros') +
          '</span>' +
        '</div>' +
      '</div>' +
      '<div class="transaction-amount">' +
        (t.tipo === 'income' ? '+' : '-') + ' ' + formatarMoeda(t.valor) +
      '</div>' +
      '<button class="btn-delete" title="Remover transação">🗑️</button>';

    // --- Adiciona evento de clique no botão de deletar ---
    // querySelector encontra o PRIMEIRO elemento que corresponde ao seletor CSS
    const btnDeletar = item.querySelector('.btn-delete');
    btnDeletar.addEventListener('click', function () {
      deletarTransacao(t.id);
    });

    // Adiciona o item à lista
    elListaTransacoes.appendChild(item);
  });
}


function renderizarGrafico() {
  // Filtra apenas as despesas
  const despesas = transacoes.filter(function (t) {
    return t.tipo === 'expense';
  });

  // Se não tem despesas, esconde o gráfico e mostra a mensagem
  if (despesas.length === 0) {
    elGraficoVazio.style.display = 'block';
    elGrafico.style.display = 'none';

    // Destroi o gráfico antigo se existir
    if (grafico) {
      grafico.destroy();
      grafico = null;
    }
    return;
  }

  // Se tem despesas, mostra o gráfico e esconde a mensagem
  elGraficoVazio.style.display = 'none';
  elGrafico.style.display = 'block';

  // --- Agrupar despesas por categoria ---
  // Usamos .reduce() para criar um objeto { categoria: valorTotal }
  //
  // Exemplo:
  // Entrada: [{ cat: "alimentacao", valor: 50 }, { cat: "alimentacao", valor: 30 }]
  // Saída: { alimentacao: 80 }
  const gastosPorCategoria = despesas.reduce(function (acumulador, t) {
    // Se a categoria já existe no acumulador, soma o valor
    // Se não existe, começa com 0 e soma
    if (acumulador[t.categoria]) {
      acumulador[t.categoria] += t.valor;
    } else {
      acumulador[t.categoria] = t.valor;
    }
    return acumulador;
  }, {}); // {} é o valor inicial (objeto vazio)

  // Separa as chaves (nomes) e valores (totais)
  const chaves = Object.keys(gastosPorCategoria);   // ["alimentacao", "transporte"]
  const valores = Object.values(gastosPorCategoria); // [80, 120]

  // Pega o nome e a cor de cada categoria
  const nomes = chaves.map(function (chave) {
    const info = categorias.expense[chave];
    return info ? info.nome : 'Outros';
  });

  const cores = chaves.map(function (chave) {
    const info = categorias.expense[chave];
    return info ? info.cor : '#8888a0';
  });

  // --- Destroi o gráfico antigo (se existir) ---
  // O Chart.js não consegue atualizar um gráfico facilmente,
  // então destruímos e criamos um novo.
  if (grafico) {
    grafico.destroy();
  }

  // --- Cria o gráfico com Chart.js ---
  grafico = new Chart(elGrafico, {
    type: 'doughnut', // Tipo: rosca (donut)

    // DADOS do gráfico
    data: {
      labels: nomes,    // Nomes das categorias (legenda)
      datasets: [{
        data: valores,   // Valores de cada categoria
        backgroundColor: cores,     // Cores de cada fatia
        borderColor: 'rgba(15, 15, 35, 0.8)',  // Cor da borda entre fatias
        borderWidth: 3,             // Largura da borda
        hoverOffset: 8              // Quanto a fatia "sai" ao passar o mouse
      }]
    },

    // CONFIGURAÇÕES do gráfico
    options: {
      responsive: true,     // Se adapta ao tamanho do container
      maintainAspectRatio: true,

      // Remove a margem interna
      layout: {
        padding: 8
      },

      // Configuração do "buraco" do donut
      cutout: '62%', // 62% do raio é cortado (cria o buraco)

      plugins: {
        // Legenda (nomes das categorias embaixo do gráfico)
        legend: {
          position: 'bottom',
          labels: {
            color: '#8888a0',
            padding: 16,
            font: {
              family: 'Inter',
              size: 12
            },
            usePointStyle: true,   // Usa bolinhas em vez de quadrados
            pointStyleWidth: 8
          }
        },

        // Tooltip (caixinha que aparece ao passar o mouse)
        tooltip: {
          backgroundColor: 'rgba(26, 26, 62, 0.95)',
          titleColor: '#f0f0f5',
          bodyColor: '#f0f0f5',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 12,
          titleFont: {
            family: 'Inter',
            weight: '600'
          },
          bodyFont: {
            family: 'Inter'
          },
          callbacks: {
            // Personaliza o texto do tooltip
            label: function (context) {
              const valor = formatarMoeda(context.parsed);
              const total = context.dataset.data.reduce(function (a, b) { return a + b; }, 0);
              const porcentagem = ((context.parsed / total) * 100).toFixed(1);
              return ' ' + context.label + ': ' + valor + ' (' + porcentagem + '%)';
            }
          }
        }
      },

      // Animação ao criar o gráfico
      animation: {
        animateRotate: true,
        animateScale: true,
        duration: 800
      }
    }
  });
}


function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',   // Formato de moeda
    currency: 'BRL'      // Real brasileiro
  }).format(valor);
}




function formatarData(dataString) {
  // new Date(dataString + 'T12:00:00') evita problemas de fuso horário
  const data = new Date(dataString + 'T12:00:00');
  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'short'
  }).format(data);
}



function salvarNoLocalStorage() {
  // Converte o array de transações para texto JSON e salva
  localStorage.setItem('financas_transacoes', JSON.stringify(transacoes));
}

function carregarDoLocalStorage() {
  // Tenta pegar os dados salvos
  const dados = localStorage.getItem('financas_transacoes');

  // Se existem dados salvos, converte de texto para array
  // Se não existem (primeira vez), retorna array vazio
  if (dados) {
    return JSON.parse(dados);
  } else {
    return [];
  }
}



function mostrarToast(mensagem, tipo) {
  // Define o texto e o tipo visual (success ou error)
  elToast.textContent = mensagem;
  elToast.className = 'toast ' + tipo;

  // Adiciona a classe 'show' para tornar visível (com animação CSS)
  // Usamos setTimeout com 10ms para garantir que a animação funcione
  setTimeout(function () {
    elToast.classList.add('show');
  }, 10);

  // Remove a classe 'show' após 3 segundos (some a notificação)
  setTimeout(function () {
    elToast.classList.remove('show');
  }, 3000);
}




document.addEventListener('DOMContentLoaded', inicializar);
