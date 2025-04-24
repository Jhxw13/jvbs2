const BarbeariaDados = {
    vendas: [],
    produtos: [
        { id: 'prod1', nome: "Shampoo", preco: 25.00, estoque: 10, descricao: "Shampoo para cabelos" },
        { id: 'prod2', nome: "Condicionador", preco: 30.00, estoque: 8, descricao: "Condicionador para cabelos" }
    ],
    profissionais: [
        { id: 'prof1', nome: "João Silva", telefone: "+1 (508) 939-1881", email: "joao@email.com", especialidade: "Corte Masculino" },
        { id: 'prof2', nome: "Pedro Santos", telefone: "+1 (508) 939-1882", email: "pedro@email.com", especialidade: "Barba" }
    ],
    servicos: [
        { id: 'serv1', nome: "Corte Masculino", preco: 30.00, descricao: "Corte tradicional masculino" },
        { id: 'serv2', nome: "Barba", preco: 20.00, descricao: "Acabamento de barba" },
        { id: 'serv3', nome: "Corte + Barba", preco: 45.00, descricao: "Combo corte e barba" }
    ],
    barbeiros: [
        { id: 'prof1', nome: "João Silva", cortes: 0 },
        { id: 'prof2', nome: "Pedro Santos", cortes: 0 }
    ],
    agendamentos: [],
    clientes: [],
    caixa: null,
    retiradas: [],

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

    importarDados(dados) {
        const camposEsperados = ['vendas', 'produtos', 'profissionais', 'servicos', 'barbeiros', 'agendamentos', 'clientes', 'caixa', 'retiradas'];
        const isValid = camposEsperados.every(campo => campo in dados);
        if (!isValid) {
            throw new Error('Arquivo de backup inválido: estrutura de dados incompleta.');
        }

        if (!Array.isArray(dados.vendas) || !Array.isArray(dados.produtos) || !Array.isArray(dados.profissionais) ||
            !Array.isArray(dados.servicos) || !Array.isArray(dados.barbeiros) || !Array.isArray(dados.agendamentos) ||
            !Array.isArray(dados.clientes) || !Array.isArray(dados.retiradas)) {
            throw new Error('Arquivo de backup inválido: campos devem ser arrays.');
        }

        this.vendas = dados.vendas.map(v => ({
            id: v.id || this.gerarId('venda_'),
            tipo: v.tipo,
            itemId: v.itemId,
            profissionalId: v.profissionalId,
            quantidade: parseInt(v.quantidade) || 1,
            valor: parseFloat(v.valor) || 0,
            metodoPagamento: v.metodoPagamento,
            gorjeta: parseFloat(v.gorjeta) || 0,
            data: v.data || new Date().toISOString()
        }));
        this.produtos = dados.produtos.map(p => ({
            id: p.id || this.gerarId('prod_'),
            nome: p.nome || '',
            preco: parseFloat(p.preco) || 0,
            estoque: parseInt(p.estoque) || 0,
            descricao: p.descricao || ''
        }));
        this.profissionais = dados.profissionais.map(p => ({
            id: p.id || this.gerarId('prof_'),
            nome: p.nome || '',
            telefone: p.telefone || '',
            email: p.email || '',
            especialidade: p.especialidade || ''
        }));
        this.servicos = dados.servicos.map(s => ({
            id: s.id || this.gerarId('serv_'),
            nome: s.nome || '',
            preco: parseFloat(s.preco) || 0,
            descricao: s.descricao || ''
        }));
        this.barbeiros = dados.barbeiros.map(b => ({
            id: b.id || this.gerarId('prof_'),
            nome: b.nome || '',
            cortes: parseInt(b.cortes) || 0
        }));
        this.agendamentos = dados.agendamentos.map(a => ({
            id: a.id || this.gerarId('agend_'),
            clientName: a.clientName || '',
            date: a.date || '',
            time: a.time || '',
            service: a.service || '',
            barberId: a.barberId || ''
        }));
        this.clientes = dados.clientes.map(c => ({
            id: c.id || this.gerarId('cli_'),
            nome: c.nome || '',
            telefone: c.telefone || '',
            email: c.email || ''
        }));
        this.caixa = dados.caixa ? {
            data: dados.caixa.data || new Date().toISOString().split('T')[0],
            valorInicial: parseFloat(dados.caixa.valorInicial) || 0,
            aberto: !!dados.caixa.aberto,
            saldoFinal: parseFloat(dados.caixa.saldoFinal) || 0
        } : null;
        this.retiradas = dados.retiradas.map(r => ({
            id: r.id || this.gerarId('retirada_'),
            valor: parseFloat(r.valor) || 0,
            motivo: r.motivo || '',
            data: r.data || new Date().toISOString()
        }));

        this.salvarDados();
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
            .filter(v => v.data.split('T')[0] === hoje && v.metodoPagamento === 'cash')
            .reduce((sum, v) => sum + v.valor + (v.gorjeta || 0), 0);
        const retiradasHoje = this.retiradas
            .filter(r => r.data.split('T')[0] === hoje)
            .reduce((sum, r) => sum + r.valor, 0);
        return parseFloat((caixa.valorInicial + vendasHoje - retiradasHoje).toFixed(2));
    },

    adicionarVenda(venda) {
        if (!venda.valor || venda.valor <= 0 || !venda.tipo || !venda.itemId || !venda.profissionalId || !venda.quantidade || venda.quantidade <= 0) {
            throw new Error('Venda deve ter valor, tipo, item, profissional e quantidade válidos.');
        }
        if (venda.gorjeta && (isNaN(venda.gorjeta) || venda.gorjeta < 0)) {
            throw new Error('Gorjeta deve ser um valor não negativo.');
        }
        if (!['zelle', 'venmo', 'cash'].includes(venda.metodoPagamento)) {
            throw new Error('Método de pagamento inválido.');
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
            gorjeta: parseFloat(venda.gorjeta || 0),
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
        const clienteExistente = this.clientes.find(c => c.nome.toLowerCase() === appointment.clientName.toLowerCase());
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
        if (cliente.telefone && !/^\+1 \(\d{3}\) \d{3}-\d{4}$/.test(cliente.telefone)) {
            throw new Error('Telefone deve estar no formato +1 (XXX) XXX-XXXX.');
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
        if (profissional.telefone && !/^\+1 \(\d{3}\) \d{3}-\d{4}$/.test(profissional.telefone)) {
            throw new Error('Telefone deve estar no formato +1 (XXX) XXX-XXXX.');
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

    obterBarbeiros() {
        return this.barbeiros;
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
        const vendasMes = this.vendas.filter(v => {
            const dataVenda = new Date(v.data);
            return dataVenda >= primeiroDiaMes;
        });

        return vendasMes.reduce((total, venda) => total + venda.valor, 0);
    },

    obterGorjetasDiarias() {
        const hoje = new Date().toISOString().split('T')[0];
        const gorjetasPorBarbeiro = {};
        this.vendas
            .filter(v => v.data.split('T')[0] === hoje && v.gorjeta > 0)
            .forEach(venda => {
                const profissionalId = venda.profissionalId;
                gorjetasPorBarbeiro[profissionalId] = (gorjetasPorBarbeiro[profissionalId] || 0) + venda.gorjeta;
            });
        return this.profissionais.map(prof => ({
            id: prof.id,
            nome: prof.nome,
            gorjeta: gorjetasPorBarbeiro[prof.id] || 0
        }));
    },

    obterGorjetasMensais() {
        const primeiroDiaMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
        const gorjetasPorBarbeiro = {};
        this.vendas
            .filter(v => v.data.split('T')[0] >= primeiroDiaMes && v.gorjeta > 0)
            .forEach(venda => {
                const profissionalId = venda.profissionalId;
                gorjetasPorBarbeiro[profissionalId] = (gorjetasPorBarbeiro[profissionalId] || 0) + venda.gorjeta;
            });
        return this.profissionais.map(prof => ({
            id: prof.id,
            nome: prof.nome,
            gorjeta: gorjetasPorBarbeiro[prof.id] || 0
        }));
    }
};