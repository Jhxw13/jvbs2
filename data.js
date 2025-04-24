const BarbeariaDados = {
    vendas: [],
    produtos: [
        { id: 'prod1', nome: "Shampoo", preco: 25, estoque: 10, descricao: "Shampoo para cabelos" },
        { id: 'prod2', nome: "Condicionador", preco: 30, estoque: 8, descricao: "Condicionador para cabelos" }
    ],
    profissionais: [
        { id: 'prof1', nome: "João Silva", telefone: "(11) 99999-9999", email: "joao@email.com", especialidade: "Corte Masculino" },
        { id: 'prof2', nome: "Pedro Santos", telefone: "(11) 88888-8888", email: "pedro@email.com", especialidade: "Barba" }
    ],
    servicos: [
        { id: 'serv1', nome: "Corte Masculino", preco: 30, descricao: "Corte tradicional masculino" },
        { id: 'serv2', nome: "Barba", preco: 20, descricao: "Acabamento de barba" },
        { id: 'serv3', nome: "Corte + Barba", preco: 45, descricao: "Combo corte e barba" }
    ],
    barbeiros: [
        { id: 'prof1', nome: "João", cortes: 0 },
        { id: 'prof2', nome: "Pedro", cortes: 0 },
        { id: 'prof3', nome: "Miguel", cortes: 0 }
    ],
    agendamentos: [],
    clientes: [],
    caixa: null,
    retiradas: [],

    // Gera um ID único simples
    gerarId(prefixo = '') {
        return prefixo + Math.random().toString(36).substr(2, 9);
    },

    inicializar() {
        const dadosSalvos = localStorage.getItem('barbeariaDados');
        if (dadosSalvos) {
            try {
                const dados = JSON.parse(dadosSalvos);
                this.vendas = dados.vendas || [];
                this.produtos = dados.produtos || this.produtos;
                this.profissionais = dados.profissionais || this.profissionais;
                this.servicos = dados.servicos || this.servicos;
                this.barbeiros = dados.barbeiros || this.barbeiros;
                this.agendamentos = dados.agendamentos || [];
                this.clientes = dados.clientes || [];
                this.caixa = dados.caixa || null;
                this.retiradas = dados.retiradas || [];
            } catch (e) {
                console.error('Erro ao carregar dados do localStorage:', e);
            }
        }
        this.salvarDados();
    },

    salvarDados() {
        try {
            localStorage.setItem('barbeariaDados', JSON.stringify({
                vendas: this.vendas,
                produtos: this.produtos,
                profissionais: this.profissionais,
                servicos: this.servicos,
                barbeiros: this.barbeiros,
                agendamentos: this.agendamentos,
                clientes: this.clientes,
                caixa: this.caixa,
                retiradas: this.retiradas
            }));
        } catch (e) {
            console.error('Erro ao salvar dados no localStorage:', e);
        }
    },

    abrirCaixa(valorInicial) {
        if (isNaN(valorInicial) || valorInicial < 0) {
            throw new Error('Valor inicial deve ser um número não negativo.');
        }
        const hoje = new Date().toISOString().split('T')[0];
        this.caixa = { data: hoje, valorInicial: parseFloat(valorInicial), aberto: true, saldoFinal: 0 };
        this.salvarDados();
    },

    fecharCaixa(saldoFinal) {
        if (!this.caixa || !this.caixa.aberto) {
            throw new Error('Caixa não está aberto.');
        }
        if (isNaN(saldoFinal) || saldoFinal < 0) {
            throw new Error('Saldo final deve ser um número não negativo.');
        }
        this.caixa.aberto = false;
        this.caixa.saldoFinal = parseFloat(saldoFinal.toFixed(2));
        this.salvarDados();
    },

    obterCaixa() {
        return this.caixa;
    },

    calcularSaldoCaixa() {
        const caixa = this.obterCaixa();
        if (!caixa) return 0;

        if (!caixa.aberto && caixa.saldoFinal !== undefined) {
            return parseFloat(caixa.saldoFinal.toFixed(2));
        }

        const hoje = new Date().toISOString().split('T')[0];
        const vendasHoje = this.vendas
            .filter(v => v.data.split('T')[0] === hoje)
            .reduce((sum, v) => sum + v.valor, 0);
        const retiradasHoje = this.retiradas
            .filter(r => r.data.split('T')[0] === hoje)
            .reduce((sum, r) => sum + r.valor, 0);
        return parseFloat((caixa.valorInicial + vendasHoje - retiradasHoje).toFixed(2));
    },

    adicionarVenda(venda) {
        if (!venda.valor || venda.valor <= 0 || !venda.tipo || !venda.itemId || !venda.profissionalId || !venda.quantidade || venda.quantidade <= 0) {
            throw new Error('Venda deve ter valor, tipo, item, profissional e quantidade válidos.');
        }
        if (venda.tipo === 'produto') {
            const produto = this.produtos.find(p => p.id === venda.itemId);
            if (!produto || produto.estoque < venda.quantidade) {
                throw new Error(`Produto ${produto?.nome || ''} não disponível ou com estoque insuficiente.`);
            }
            produto.estoque -= venda.quantidade;
        }
        this.vendas.push({
            ...venda,
            data: new Date().toISOString(),
            id: this.gerarId('venda_')
        });
        this.salvarDados();
    },

    obterVendas() {
        return this.vendas;
    },

    adicionarRetirada(retirada) {
        if (!retirada.valor || retirada.valor <= 0 || !retirada.motivo) {
            throw new Error('Retirada deve ter um valor positivo e motivo especificado.');
        }
        this.retiradas.push({
            ...retirada,
            data: new Date().toISOString(),
            id: this.gerarId('retirada_')
        });
        this.salvarDados();
    },

    obterRetiradas() {
        return this.retiradas;
    },

    registrarCorte(barbeiroId) {
        const barbeiro = this.barbeiros.find(b => b.id === barbeiroId);
        if (!barbeiro) {
            throw new Error('Barbeiro não encontrado.');
        }
        barbeiro.cortes++;
        this.salvarDados();
    },

    adicionarAgendamento(appointment) {
        if (!appointment.clientName || !appointment.date || !appointment.service || !appointment.barberId) {
            throw new Error('Agendamento deve ter nome do cliente, data, serviço e barbeiro especificados.');
        }
        const id = this.gerarId('agend_');
        this.agendamentos.push({ ...appointment, id });
        const clienteExistente = this.clientes.find(c => c.nome === appointment.clientName);
        if (!clienteExistente) {
            this.clientes.push({
                id: this.gerarId('cli_'),
                nome: appointment.clientName,
                telefone: appointment.telefone || "",
                email: appointment.email || ""
            });
        }
        this.salvarDados();
    },

    removerAgendamento(id) {
        const index = this.agendamentos.findIndex(a => a.id === id);
        if (index === -1) {
            throw new Error('Agendamento não encontrado.');
        }
        this.agendamentos.splice(index, 1);
        this.salvarDados();
    },

    obterAgendamentos() {
        return this.agendamentos;
    },

    adicionarCliente(cliente) {
        if (!cliente.nome) {
            throw new Error('Cliente deve ter um nome especificado.');
        }
        this.clientes.push({
            id: this.gerarId('cli_'),
            nome: cliente.nome,
            telefone: cliente.telefone || "",
            email: cliente.email || ""
        });
        this.salvarDados();
    },

    removerCliente(id) {
        const index = this.clientes.findIndex(c => c.id === id);
        if (index === -1) {
            throw new Error('Cliente não encontrado.');
        }
        this.clientes.splice(index, 1);
        this.salvarDados();
    },

    obterClientes() {
        return this.clientes;
    },

    adicionarServico(servico) {
        if (!servico.nome || !servico.preco || servico.preco <= 0) {
            throw new Error('Serviço deve ter nome e preço positivo.');
        }
        this.servicos.push({ ...servico, id: this.gerarId('serv_') });
        this.salvarDados();
    },

    removerServico(id) {
        this.servicos = this.servicos.filter(s => s.id !== id);
        this.salvarDados();
    },

    obterServicos() {
        return this.servicos;
    },

    adicionarProfissional(profissional) {
        if (!profissional.nome || !profissional.especialidade) {
            throw new Error('Profissional deve ter nome e especialidade especificados.');
        }
        const id = this.gerarId('prof_');
        this.profissionais.push({ ...profissional, id });
        this.barbeiros.push({ id, nome: profissional.nome, cortes: 0 });
        this.salvarDados();
    },

    removerProfissional(id) {
        this.profissionais = this.profissionais.filter(p => p.id !== id);
        this.barbeiros = this.barbeiros.filter(b => b.id !== id);
        this.salvarDados();
    },

    obterProfissionais() {
        return this.profissionais;
    },

    adicionarProduto(produto) {
        if (!produto.nome || !produto.preco || produto.preco <= 0 || !produto.estoque || produto.estoque < 0) {
            throw new Error('Produto deve ter nome, preço positivo e estoque não negativo.');
        }
        this.produtos.push({ ...produto, id: this.gerarId('prod_') });
        this.salvarDados();
    },

    removerProduto(id) {
        this.produtos = this.produtos.filter(p => p.id !== id);
        this.salvarDados();
    },

    obterProdutos() {
        return this.produtos;
    },

    obterEstatisticas() {
        return this.barbeiros.map(barbeiro => ({
            id: barbeiro.id,
            nome: barbeiro.nome,
            totalCortes: barbeiro.cortes
        }));
    },

    calcularReceitaMensal() {
        const hoje = new Date();
        const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        const agendamentosMes = this.agendamentos.filter(a => {
            const dataAgendamento = new Date(a.date);
            return dataAgendamento >= primeiroDiaMes;
        });

        return agendamentosMes.reduce((total, agendamento) => {
            const servico = this.servicos.find(s => s.nome.toLowerCase() === agendamento.service.toLowerCase());
            return total + (servico ? servico.preco : 0);
        }, 0);
    }
};