document.addEventListener('DOMContentLoaded', () => {
    // Inicializar dados
    BarbeariaDados.inicializar();

    // Cache de dados para melhorar performance
    let cachedProfissionais = BarbeariaDados.obterProfissionais();
    let cachedServicos = BarbeariaDados.obterServicos();
    let cachedProdutos = BarbeariaDados.obterProdutos();

    // --- Navegação ---
    function inicializarNavegacao() {
        const menuItems = document.querySelectorAll('.sidebar nav ul li');
        menuItems.forEach(item => {
            item.addEventListener('click', () => {
                const page = item.getAttribute('data-page');
                document.querySelector('.page.active').classList.remove('active');
                document.querySelector(`#page-${page}`).classList.add('active');
                document.querySelector('.sidebar li.active').classList.remove('active');
                item.classList.add('active');
            });
        });
    }

    // --- Feedback Visual ---
    function mostrarFeedback(mensagem, tipo) {
        const feedback = document.getElementById('feedback');
        feedback.textContent = mensagem;
        feedback.className = `feedback ${tipo}`;
        feedback.style.display = 'block';
        setTimeout(() => {
            feedback.style.display = 'none';
        }, 3000);
    }

    // --- Backup: Exportar e Importar ---
    function inicializarBackup() {
        const exportBackupBtn = document.getElementById('export-backup-btn');
        const importBackupInput = document.getElementById('import-backup');

        if (exportBackupBtn) {
            exportBackupBtn.addEventListener('click', () => {
                try {
                    const dados = JSON.parse(localStorage.getItem('barbeariaDados') || '{}');
                    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    const hoje = new Date().toISOString().split('T')[0].replace(/-/g, '');
                    a.href = url;
                    a.download = `jvbarbershop_backup_${hoje}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    mostrarFeedback('Backup exportado com sucesso!', 'success');
                } catch (e) {
                    console.error('Erro ao exportar backup:', e);
                    mostrarFeedback('Erro ao exportar backup.', 'error');
                }
            });
        }

        if (importBackupInput) {
            importBackupInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file || !file.name.endsWith('.json')) {
                    mostrarFeedback('Por favor, selecione um arquivo JSON válido.', 'error');
                    return;
                }

                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const dados = JSON.parse(event.target.result);
                        BarbeariaDados.importarDados(dados);
                        cachedProfissionais = BarbeariaDados.obterProfissionais();
                        cachedServicos = BarbeariaDados.obterServicos();
                        cachedProdutos = BarbeariaDados.obterProdutos();
                        atualizarDashboard();
                        atualizarListaVendas();
                        atualizarListaProdutos();
                        atualizarListaServicos();
                        atualizarListaProfissionais();
                        atualizarListaClientes();
                        atualizarFinanceiro();
                        atualizarStatusCaixa();
                        atualizarAgendamentos();
                        mostrarFeedback('Backup importado com sucesso!', 'success');
                        importBackupInput.value = '';
                    } catch (e) {
                        console.error('Erro ao importar backup:', e);
                        mostrarFeedback('Erro ao importar backup: arquivo inválido.', 'error');
                    }
                };
                reader.readAsText(file);
            });
        }
    }

    // --- Agendamentos ---
    function inicializarAgendamentos() {
        const barberSelect = document.getElementById('barber');
        const serviceSelect = document.getElementById('service');

        if (barberSelect) {
            BarbeariaDados.obterBarbeiros().forEach(barbeiro => {
                const option = document.createElement('option');
                option.value = barbeiro.id;
                option.textContent = barbeiro.nome;
                barberSelect.appendChild(option);
            });
        }

        if (serviceSelect) {
            cachedServicos.forEach(servico => {
                const option = document.createElement('option');
                option.value = servico.id;
                option.textContent = `${servico.nome} - US$ ${servico.preco.toFixed(2)}`;
                serviceSelect.appendChild(option);
            });
        }

        const form = document.getElementById('appointment-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const appointment = {
                    clientName: document.getElementById('client-name').value.trim(),
                    date: document.getElementById('date').value,
                    time: document.getElementById('time').value,
                    service: cachedServicos.find(s => s.id === document.getElementById('service').value)?.nome || '',
                    barberId: document.getElementById('barber').value
                };
                try {
                    if (!appointment.service) {
                        throw new Error('Selecione um serviço válido.');
                    }
                    BarbeariaDados.adicionarAgendamento(appointment);
                    atualizarAgendamentos();
                    atualizarDashboard();

                    const mensagem = `Olá ${appointment.clientName}! Seu agendamento foi confirmado:\n\nData: ${appointment.date}\nHorário: ${appointment.time}\nServiço: ${appointment.service}\n\nAguardamos você!`;
                    const mensagemFormatada = encodeURIComponent(mensagem);

                    const cliente = BarbeariaDados.obterClientes().find(c => c.nome.toLowerCase() === appointment.clientName.toLowerCase());
                    if (cliente && cliente.telefone) {
                        const telefone = cliente.telefone.replace(/\D/g, '');
                        window.open(`https://wa.me/1${telefone}?text=${mensagemFormatada}`, '_blank');
                    }

                    form.reset();
                    mostrarFeedback('Agendamento registrado com sucesso!', 'success');
                } catch (e) {
                    mostrarFeedback(e.message, 'error');
                }
            });
        }
    }

    function atualizarAgendamentos() {
        const appointmentsLists = document.querySelectorAll('#appointments-list');
        if (appointmentsLists) {
            const agendamentos = BarbeariaDados.obterAgendamentos();
            appointmentsLists.forEach(list => {
                list.innerHTML = `
                    <h2>Agendamentos</h2>
                    ${agendamentos.map((appointment, index) => `
                        <div class="appointment-card">
                            <div>
                                <p><strong>Cliente:</strong> ${appointment.clientName}</p>
                                <p><strong>Data:</strong> ${appointment.date}</p>
                                <p><strong>Hora:</strong> ${appointment.time}</p>
                                <p><strong>Serviço:</strong> ${appointment.service}</p>
                            </div>
                            <button onclick="deleteAppointment('${appointment.id}')">Cancelar</button>
                        </div>
                    `).join('')}
                `;
            });
        }
    }

    // --- PDV: Controle do Caixa Diário ---
    function inicializarCaixa() {
        const cashForm = document.getElementById('cash-form');
        const cashStatus = document.getElementById('cash-status');
        const finalizeSaleBtn = document.getElementById('finalize-sale');
        const withdrawBtn = document.getElementById('withdraw-btn');
        const closeCashBtn = document.getElementById('close-cash-btn');
        const cashBalanceDisplay = document.getElementById('cash-balance-display');

        function atualizarStatusCaixa() {
            const caixa = BarbeariaDados.obterCaixa();
            const hoje = new Date().toISOString().split('T')[0];
            if (caixa && caixa.aberto && caixa.data === hoje) {
                cashStatus.textContent = `Caixa Aberto (US$ ${caixa.valorInicial.toFixed(2)})`;
                cashStatus.classList.remove('cash-closed');
                cashStatus.classList.add('cash-open');
                cashForm.style.display = 'none';
                closeCashBtn.style.display = 'block';
                closeCashBtn.disabled = false;
                finalizeSaleBtn.disabled = false;
                withdrawBtn.disabled = false;
            } else {
                cashStatus.textContent = 'Caixa Fechado';
                cashStatus.classList.remove('cash-open');
                cashStatus.classList.add('cash-closed');
                cashForm.style.display = 'block';
                closeCashBtn.style.display = 'none';
                finalizeSaleBtn.disabled = true;
                withdrawBtn.disabled = true;
            }
            atualizarSaldoCaixa();
        }

        function atualizarSaldoCaixa() {
            const saldo = BarbeariaDados.calcularSaldoCaixa();
            cashBalanceDisplay.textContent = `US$ ${saldo.toFixed(2)}`;
        }

        function fecharCaixa() {
            try {
                const caixa = BarbeariaDados.obterCaixa();
                if (!caixa || !caixa.aberto) {
                    throw new Error('O caixa já está fechado ou não foi aberto hoje.');
                }
                const saldoFinal = BarbeariaDados.calcularSaldoCaixa();
                BarbeariaDados.fecharCaixa(saldoFinal);
                atualizarStatusCaixa();
                atualizarFinanceiro();
                mostrarFeedback(`Caixa fechado com sucesso! Saldo final: US$ ${saldoFinal.toFixed(2)}`, 'success');
            } catch (e) {
                mostrarFeedback(e.message, 'error');
            }
        }

        if (cashForm) {
            cashForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const valorInicial = parseFloat(document.getElementById('cash-initial').value);
                try {
                    if (isNaN(valorInicial) || valorInicial < 0) {
                        throw new Error('Insira um valor inicial válido.');
                    }
                    BarbeariaDados.abrirCaixa(valorInicial);
                    atualizarStatusCaixa();
                    cashForm.reset();
                    mostrarFeedback('Caixa aberto com sucesso!', 'success');
                } catch (e) {
                    mostrarFeedback(e.message, 'error');
                }
            });
        }

        if (closeCashBtn) {
            closeCashBtn.addEventListener('click', fecharCaixa);
        }
    }

    // --- PDV: Controle de Retiradas ---
    function inicializarRetiradas() {
        const withdrawalForm = document.getElementById('withdrawal-form');
        if (withdrawalForm) {
            withdrawalForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const valor = parseFloat(document.getElementById('withdrawal-amount').value);
                const motivo = document.getElementById('withdrawal-reason').value.trim();
                const saldo = BarbeariaDados.calcularSaldoCaixa();

                try {
                    if (!BarbeariaDados.obterCaixa()?.aberto) {
                        throw new Error('O caixa deve estar aberto para registrar uma retirada.');
                    }
                    if (isNaN(valor) || valor <= 0) {
                        throw new Error('Insira um valor de retirada válido.');
                    }
                    if (valor > saldo) {
                        throw new Error(`Saldo insuficiente! Saldo disponível: US$ ${saldo.toFixed(2)}.`);
                    }
                    if (!motivo) {
                        throw new Error('Por favor, informe o motivo da retirada.');
                    }

                    BarbeariaDados.adicionarRetirada({ valor, motivo });
                    atualizarSaldoCaixa();
                    atualizarFinanceiro();
                    withdrawalForm.reset();
                    mostrarFeedback('Retirada registrada com sucesso!', 'success');
                } catch (e) {
                    mostrarFeedback(e.message, 'error');
                }
            });
        }
    }

    // --- PDV: Controle de Vendas ---
    let selectedItems = [];
    let totalVenda = 0;
    let gorjeta = 0;

    function inicializarVendas() {
        const saleServiceSelect = document.getElementById('sale-service');
        const saleProductSelect = document.getElementById('sale-product');
        const saleProfessionalSelect = document.getElementById('sale-professional');
        const selectedItemsDiv = document.getElementById('selected-items');
        const saleTotalSpan = document.getElementById('sale-total');
        const saleTipInput = document.getElementById('sale-tip');
        const saleTipDisplay = document.getElementById('sale-tip-display');

        function atualizarTotal() {
            totalVenda = selectedItems.reduce((total, item) => total + item.valor, 0);
            saleTotalSpan.textContent = `US$ ${totalVenda.toFixed(2)}`;
            gorjeta = parseFloat(saleTipInput.value) || 0;
            saleTipDisplay.textContent = `US$ ${gorjeta.toFixed(2)}`;
        }

        function atualizarItensSelecionados() {
            selectedItemsDiv.innerHTML = selectedItems.map((item, index) => `
                <div class="selected-item">
                    <p>${item.tipo === 'servico' ? 'Serviço' : 'Produto'}: ${item.nome} - 
                       Qtd: ${item.quantidade} - US$ ${item.valor.toFixed(2)}</p>
                    <button type="button" onclick="removerItem(${index})">Remover</button>
                </div>
            `).join('');
            atualizarTotal();
        }

        window.removerItem = (index) => {
            selectedItems.splice(index, 1);
            atualizarItensSelecionados();
        };

        if (saleServiceSelect) {
            cachedServicos.forEach(servico => {
                const option = document.createElement('option');
                option.value = servico.id;
                option.textContent = `${servico.nome} - US$ ${servico.preco.toFixed(2)}`;
                saleServiceSelect.appendChild(option);
            });
        }

        if (saleProductSelect) {
            cachedProdutos.forEach(produto => {
                const option = document.createElement('option');
                option.value = produto.id;
                option.textContent = `${produto.nome} - US$ ${produto.preco.toFixed(2)}`;
                saleProductSelect.appendChild(option);
            });
        }

        if (saleProfessionalSelect) {
            cachedProfissionais.forEach(profissional => {
                const option = document.createElement('option');
                option.value = profissional.id;
                option.textContent = profissional.nome;
                saleProfessionalSelect.appendChild(option);
            });
        }

        document.getElementById('add-service').addEventListener('click', () => {
            const servicoId = saleServiceSelect.value;
            if (servicoId) {
                const servico = cachedServicos.find(s => s.id === servicoId);
                selectedItems.push({
                    tipo: 'servico',
                    id: servicoId,
                    nome: servico.nome,
                    quantidade: 1,
                    valor: servico.preco
                });
                atualizarItensSelecionados();
                saleServiceSelect.value = '';
            }
        });

        document.getElementById('add-product').addEventListener('click', () => {
            const produtoId = saleProductSelect.value;
            const quantidade = parseInt(document.getElementById('sale-quantity').value);
            if (produtoId && quantidade > 0) {
                const produto = cachedProdutos.find(p => p.id === produtoId);
                if (produto.estoque < quantidade) {
                    mostrarFeedback(`Estoque insuficiente! Disponível: ${produto.estoque} unidades de ${produto.nome}.`, 'error');
                    return;
                }
                selectedItems.push({
                    tipo: 'produto',
                    id: produtoId,
                    nome: produto.nome,
                    quantidade: quantidade,
                    valor: produto.preco * quantidade
                });
                atualizarItensSelecionados();
                saleProductSelect.value = '';
                document.getElementById('sale-quantity').value = 1;
            }
        });

        saleTipInput.addEventListener('input', atualizarTotal);

        const salesForm = document.getElementById('sales-form');
        if (salesForm) {
            salesForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const profissionalId = document.getElementById('sale-professional').value;
                const metodoPagamento = document.getElementById('payment-method').value;
                const gorjetaVenda = parseFloat(saleTipInput.value) || 0;

                try {
                    if (!profissionalId || selectedItems.length === 0 || !metodoPagamento) {
                        throw new Error('Selecione um profissional, método de pagamento e pelo menos um item para a venda.');
                    }
                    if (gorjetaVenda < 0) {
                        throw new Error('A gorjeta não pode ser negativa.');
                    }
                    if (!BarbeariaDados.obterCaixa()?.aberto) {
                        throw new Error('O caixa deve estar aberto para registrar uma venda.');
                    }

                    let estoqueValido = true;
                    selectedItems.forEach(item => {
                        if (item.tipo === 'produto') {
                            const produto = cachedProdutos.find(p => p.id === item.id);
                            if (produto.estoque < item.quantidade) {
                                mostrarFeedback(`Estoque insuficiente para ${produto.nome}! Disponível: ${produto.estoque} unidades.`, 'error');
                                estoqueValido = false;
                            }
                        }
                    });

                    if (!estoqueValido) return;

                    selectedItems.forEach(item => {
                        const venda = {
                            tipo: item.tipo,
                            itemId: item.id,
                            profissionalId: profissionalId,
                            quantidade: item.quantidade,
                            valor: item.valor,
                            metodoPagamento: metodoPagamento,
                            gorjeta: item.tipo === 'servico' ? gorjetaVenda : 0
                        };

                        if (item.tipo === 'servico') {
                            BarbeariaDados.registrarCorte(profissionalId);
                        }
                        BarbeariaDados.adicionarVenda(venda);
                    });

                    selectedItems = [];
                    atualizarItensSelecionados();
                    atualizarListaVendas();
                    salesForm.reset();
                    saleTipInput.value = '0';
                    atualizarDashboard();
                    atualizarListaProdutos();
                    atualizarFinanceiro();
                    atualizarSaldoCaixa();
                    mostrarFeedback('Venda finalizada com sucesso!', 'success');
                } catch (e) {
                    mostrarFeedback(e.message, 'error');
                }
            });
        }
    }

    function atualizarListaVendas() {
        const salesList = document.getElementById('sales-list');
        if (salesList) {
            const vendas = BarbeariaDados.obterVendas();
            salesList.innerHTML = `
                <h2>Vendas Realizadas</h2>
                ${vendas.map(venda => {
                    const profissional = cachedProfissionais.find(p => p.id === venda.profissionalId);
                    const item = venda.tipo === 'servico'
                        ? cachedServicos.find(s => s.id === venda.itemId)
                        : cachedProdutos.find(p => p.id === venda.itemId);

                    return `
                        <div class="sale-card">
                            <div>
                                <p><strong>Tipo:</strong> ${venda.tipo === 'servico' ? 'Serviço' : 'Produto'}</p>
                                <p><strong>Item:</strong> ${item?.nome || 'Item desconhecido'}</p>
                                <p><strong>Profissional:</strong> ${profissional?.nome || 'Desconhecido'}</p>
                                <p><strong>Quantidade:</strong> ${venda.quantidade}</p>
                                <p><strong>Valor:</strong> US$ ${venda.valor.toFixed(2)}</p>
                                <p><strong>Gorjeta:</strong> US$ ${(venda.gorjeta || 0).toFixed(2)}</p>
                                <p><strong>Método:</strong> ${formatarMetodoPagamento(venda.metodoPagamento)}</p>
                                <p><strong>Data:</strong> ${new Date(venda.data).toLocaleString()}</p>
                            </div>
                        </div>
                    `;
                }).join('')}
            `;
        }
    }

    function formatarMetodoPagamento(metodo) {
        const metodos = {
            'zelle': 'Zelle',
            'venmo': 'Venmo',
            'cash': 'Cash'
        };
        return metodos[metodo] || metodo;
    }

    // --- Dashboard ---
    function atualizarDashboard() {
        const vendas = BarbeariaDados.obterVendas();

        const estatisticasPorBarbeiro = cachedProfissionais.map(profissional => {
            const vendasBarbeiro = vendas.filter(v => v.profissionalId === profissional.id);
            const totalCortes = vendasBarbeiro.filter(v => v.tipo === 'servico').length;
            const totalReceita = vendasBarbeiro.reduce((total, venda) => total + venda.valor, 0);

            return {
                nome: profissional.nome,
                totalCortes,
                totalReceita
            };
        });

        const totalCortes = estatisticasPorBarbeiro.reduce((total, barb) => total + barb.totalCortes, 0);
        const totalReceita = estatisticasPorBarbeiro.reduce((total, barb) => total + barb.totalReceita, 0);

        document.getElementById('total-haircuts').textContent = totalCortes;
        document.getElementById('total-clients').textContent = BarbeariaDados.obterClientes().length;
        document.getElementById('total-revenue').textContent = `US$ ${totalReceita.toFixed(2)}`;

        const oldPerformanceChart = Chart.getChart('barbers-performance-chart');
        if (oldPerformanceChart) {
            oldPerformanceChart.destroy();
        }
        const oldRevenueChart = Chart.getChart('revenue-by-barber-chart');
        if (oldRevenueChart) {
            oldRevenueChart.destroy();
        }

        const performanceChart = new Chart(document.getElementById('barbers-performance-chart'), {
            type: 'bar',
            data: {
                labels: estatisticasPorBarbeiro.map(b => b.nome),
                datasets: [{
                    label: 'Total de Cortes',
                    data: estatisticasPorBarbeiro.map(b => b.totalCortes),
                    backgroundColor: '#9b59b6'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Cortes por Profissional',
                        color: '#fff'
                    },
                    legend: {
                        labels: {
                            color: '#fff'
                        }
                    }
                },
                scales: {
                    y: {
                        ticks: {
                            color: '#fff'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#fff'
                        }
                    }
                }
            }
        });

        const revenueChart = new Chart(document.getElementById('revenue-by-barber-chart'), {
            type: 'pie',
            data: {
                labels: estatisticasPorBarbeiro.map(b => b.nome),
                datasets: [{
                    data: estatisticasPorBarbeiro.map(b => b.totalReceita),
                    backgroundColor: ['#9b59b6', '#8e44ad', '#3498db', '#2ecc71']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Receita por Profissional',
                        color: '#fff'
                    },
                    legend: {
                        labels: {
                            color: '#fff'
                        }
                    }
                }
            }
        });

        atualizarAgendamentos();
    }

    window.registrarCorte = (barbeiroId) => {
        try {
            BarbeariaDados.registrarCorte(barbeiroId);
            atualizarDashboard();
        } catch (e) {
            mostrarFeedback(e.message, 'error');
        }
    };

    window.deleteAppointment = (id) => {
        try {
            BarbeariaDados.removerAgendamento(id);
            atualizarAgendamentos();
            atualizarDashboard();
            mostrarFeedback('Agendamento cancelado com sucesso!', 'success');
        } catch (e) {
            mostrarFeedback(e.message, 'error');
        }
    };

    // --- Clientes ---
    function inicializarClientes() {
        const clientForm = document.getElementById('client-form');
        if (clientForm) {
            clientForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const telefone = document.getElementById('new-client-phone').value.trim();
                const telefoneRegex = /^\+1 \(\d{3}\) \d{3}-\d{4}$/;

                try {
                    if (telefone && !telefoneRegex.test(telefone)) {
                        throw new Error('Por favor, insira o telefone no formato: +1 (508) 939-1881');
                    }
                    const cliente = {
                        nome: document.getElementById('new-client-name').value.trim(),
                        telefone: telefone,
                        email: document.getElementById('new-client-email').value.trim()
                    };
                    if (!cliente.nome) {
                        throw new Error('O nome do cliente é obrigatório.');
                    }
                    BarbeariaDados.adicionarCliente(cliente);
                    atualizarListaClientes();
                    clientForm.reset();
                    mostrarFeedback('Cliente adicionado com sucesso!', 'success');
                } catch (e) {
                    mostrarFeedback(e.message, 'error');
                }
            });
        }
    }

    function atualizarListaClientes() {
        const clientsList = document.getElementById('clients-list');
        if (clientsList) {
            const clientes = BarbeariaDados.obterClientes();
            clientsList.innerHTML = `
                <h2>Clientes Cadastrados</h2>
                ${clientes.map(cliente => `
                    <div class="client-card">
                        <div>
                            <p><strong>Nome:</strong> ${cliente.nome}</p>
                            <p><strong>Telefone:</strong> ${cliente.telefone || 'N/A'}</p>
                            <p><strong>Email:</strong> ${cliente.email || 'N/A'}</p>
                        </div>
                        <button onclick="removerCliente('${cliente.id}')">Remover</button>
                    </div>
                `).join('')}
            `;
        }
    }

    window.removerCliente = (id) => {
        try {
            BarbeariaDados.removerCliente(id);
            atualizarListaClientes();
            atualizarDashboard();
            mostrarFeedback('Cliente removido com sucesso!', 'success');
        } catch (e) {
            mostrarFeedback(e.message, 'error');
        }
    };

    // --- Serviços ---
    function inicializarServicos() {
        const serviceForm = document.getElementById('service-form');
        if (serviceForm) {
            serviceForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const preco = parseFloat(document.getElementById('service-price').value);
                try {
                    if (isNaN(preco) || preco <= 0) {
                        throw new Error('O preço do serviço deve ser um valor positivo.');
                    }
                    const servico = {
                        nome: document.getElementById('service-name').value.trim(),
                        preco: preco,
                        descricao: document.getElementById('service-description').value.trim()
                    };
                    if (!servico.nome) {
                        throw new Error('O nome do serviço é obrigatório.');
                    }
                    BarbeariaDados.adicionarServico(servico);
                    cachedServicos = BarbeariaDados.obterServicos();
                    atualizarListaServicos();
                    serviceForm.reset();
                    mostrarFeedback('Serviço adicionado com sucesso!', 'success');
                } catch (e) {
                    mostrarFeedback(e.message, 'error');
                }
            });
        }
    }

    function atualizarListaServicos() {
        const servicesList = document.getElementById('services-list');
        if (servicesList) {
            servicesList.innerHTML = `
                <h2>Serviços Cadastrados</h2>
                ${cachedServicos.map(servico => `
                    <div class="service-card">
                        <div>
                            <p><strong>Nome:</strong> ${servico.nome}</p>
                            <p><strong>Preço:</strong> US$ ${servico.preco.toFixed(2)}</p>
                            <p><strong>Descrição:</strong> ${servico.descricao || 'N/A'}</p>
                        </div>
                        <button onclick="removerServico('${servico.id}')">Remover</button>
                    </div>
                `).join('')}
            `;
        }
    }

    window.removerServico = (id) => {
        try {
            BarbeariaDados.removerServico(id);
            cachedServicos = BarbeariaDados.obterServicos();
            atualizarListaServicos();
            mostrarFeedback('Serviço removido com sucesso!', 'success');
        } catch (e) {
            mostrarFeedback(e.message, 'error');
        }
    };

    // --- Profissionais ---
    function inicializarProfissionais() {
        const professionalForm = document.getElementById('professional-form');
        if (professionalForm) {
            professionalForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const telefone = document.getElementById('professional-phone').value.trim();
                const telefoneRegex = /^\+1 \(\d{3}\) \d{3}-\d{4}$/;
                try {
                    if (telefone && !telefoneRegex.test(telefone)) {
                        throw new Error('Por favor, insira o telefone no formato: +1 (508) 939-1881');
                    }
                    const profissional = {
                        nome: document.getElementById('professional-name').value.trim(),
                        telefone: telefone,
                        email: document.getElementById('professional-email').value.trim(),
                        especialidade: document.getElementById('professional-specialty').value.trim()
                    };
                    if (!profissional.nome || !profissional.especialidade) {
                        throw new Error('Nome e especialidade são obrigatórios.');
                    }
                    BarbeariaDados.adicionarProfissional(profissional);
                    cachedProfissionais = BarbeariaDados.obterProfissionais();
                    atualizarListaProfissionais();
                    professionalForm.reset();
                    mostrarFeedback('Profissional adicionado com sucesso!', 'success');
                } catch (e) {
                    mostrarFeedback(e.message, 'error');
                }
            });
        }
    }

    function atualizarListaProfissionais() {
        const professionalsList = document.getElementById('professionals-list');
        if (professionalsList) {
            professionalsList.innerHTML = `
                <h2>Profissionais Cadastrados</h2>
                ${cachedProfissionais.map(profissional => `
                    <div class="professional-card">
                        <div>
                            <p><strong>Nome:</strong> ${profissional.nome}</p>
                            <p><strong>Telefone:</strong> ${profissional.telefone || 'N/A'}</p>
                            <p><strong>Email:</strong> ${profissional.email || 'N/A'}</p>
                            <p><strong>Especialidade:</strong> ${profissional.especialidade}</p>
                        </div>
                        <button onclick="removerProfissional('${profissional.id}')">Remover</button>
                    </div>
                `).join('')}
            `;
        }
    }

    window.removerProfissional = (id) => {
        try {
            BarbeariaDados.removerProfissional(id);
            cachedProfissionais = BarbeariaDados.obterProfissionais();
            atualizarListaProfissionais();
            atualizarDashboard();
            mostrarFeedback('Profissional removido com sucesso!', 'success');
        } catch (e) {
            mostrarFeedback(e.message, 'error');
        }
    };

    // --- Produtos ---
    function inicializarProdutos() {
        const productForm = document.getElementById('product-form');
        if (productForm) {
            productForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const preco = parseFloat(document.getElementById('product-price').value);
                const estoque = parseInt(document.getElementById('product-stock').value);
                try {
                    if (isNaN(preco) || preco <= 0) {
                        throw new Error('O preço do produto deve ser um valor positivo.');
                    }
                    if (isNaN(estoque) || estoque < 0) {
                        throw new Error('O estoque deve ser um valor não negativo.');
                    }
                    const produto = {
                        nome: document.getElementById('product-name').value.trim(),
                        preco: preco,
                        estoque: estoque,
                        descricao: document.getElementById('product-description').value.trim()
                    };
                    if (!produto.nome) {
                        throw new Error('O nome do produto é obrigatório.');
                    }
                    BarbeariaDados.adicionarProduto(produto);
                    cachedProdutos = BarbeariaDados.obterProdutos();
                    atualizarListaProdutos();
                    productForm.reset();
                    mostrarFeedback('Produto adicionado com sucesso!', 'success');
                } catch (e) {
                    mostrarFeedback(e.message, 'error');
                }
            });
        }
    }

    function atualizarListaProdutos() {
        const productsList = document.getElementById('products-list');
        if (productsList) {
            productsList.innerHTML = `
                <h2>Produtos Cadastrados</h2>
                ${cachedProdutos.map(produto => `
                    <div class="product-card">
                        <div>
                            <p><strong>Nome:</strong> ${produto.nome}</p>
                            <p><strong>Preço:</strong> US$ ${produto.preco.toFixed(2)}</p>
                            <p><strong>Estoque:</strong> ${produto.estoque}</p>
                            <p><strong>Descrição:</strong> ${produto.descricao || 'N/A'}</p>
                        </div>
                        <button onclick="removerProduto('${produto.id}')">Remover</button>
                    </div>
                `).join('')}
            `;
        }
    }

    window.removerProduto = (id) => {
        try {
            BarbeariaDados.removerProduto(id);
            cachedProdutos = BarbeariaDados.obterProdutos();
            atualizarListaProdutos();
            mostrarFeedback('Produto removido com sucesso!', 'success');
        } catch (e) {
            mostrarFeedback(e.message, 'error');
        }
    };

    // --- Financeiro ---
    function atualizarFinanceiro() {
        const vendas = BarbeariaDados.obterVendas();
        const retiradas = BarbeariaDados.obterRetiradas();
        const hoje = new Date().toISOString().split('T')[0];
        const primeiroDiaMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

        // Calcular a data de início da semana (segunda-feira)
        const hojeDate = new Date();
        const diaSemana = hojeDate.getDay(); // 0 (domingo) a 6 (sábado)
        const primeiroDiaSemana = new Date(hojeDate);
        primeiroDiaSemana.setDate(hojeDate.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1)); // Ajusta para segunda-feira
        const primeiroDiaSemanaStr = primeiroDiaSemana.toISOString().split('T')[0];

        // Calcular totais gerais
        const totais = vendas.reduce((acc, venda) => {
            const dataVenda = venda.data.split('T')[0];
            if (dataVenda === hoje) {
                acc.hoje += venda.valor;
                acc.metodos[venda.metodoPagamento] = (acc.metodos[venda.metodoPagamento] || 0) + venda.valor;
            }
            if (dataVenda >= primeiroDiaMes) {
                acc.mes += venda.valor;
            }
            if (dataVenda >= primeiroDiaSemanaStr) {
                acc.semana += venda.valor;
            }
            acc.total += venda.valor;
            return acc;
        }, { hoje: 0, mes: 0, semana: 0, total: 0, metodos: {} });

        // Calcular vendas por barbeiro na semana
        const vendasPorBarbeiroSemana = {};
        vendas.forEach(venda => {
            const dataVenda = venda.data.split('T')[0];
            if (dataVenda >= primeiroDiaSemanaStr) {
                const profissional = cachedProfissionais.find(p => p.id === venda.profissionalId);
                const nome = profissional ? profissional.nome : 'Desconhecido';
                if (!vendasPorBarbeiroSemana[venda.profissionalId]) {
                    vendasPorBarbeiroSemana[venda.profissionalId] = { nome, total: 0 };
                }
                vendasPorBarbeiroSemana[venda.profissionalId].total += venda.valor;
            }
        });

        // Atualizar cards principais
        document.getElementById('today-sales').textContent = `US$ ${totais.hoje.toFixed(2)}`;
        document.getElementById('month-sales').textContent = `US$ ${totais.mes.toFixed(2)}`;
        document.getElementById('week-sales').textContent = `US$ ${totais.semana.toFixed(2)}`;
        document.getElementById('total-sales').textContent = `US$ ${totais.total.toFixed(2)}`;
        document.getElementById('cash-balance').textContent = `US$ ${BarbeariaDados.calcularSaldoCaixa().toFixed(2)}`;

        // Atualizar vendas por barbeiro na semana
        const weeklyBarberSales = document.getElementById('weekly-barber-sales');
        if (weeklyBarberSales) {
            weeklyBarberSales.innerHTML = `
                <h2>Vendas por Profissional (Semana)</h2>
                ${Object.values(vendasPorBarbeiroSemana).length > 0 ? 
                    Object.values(vendasPorBarbeiroSemana).map(barbeiro => `
                        <div class="barber-sales-card">
                            <p><strong>${barbeiro.nome}</strong>: US$ ${barbeiro.total.toFixed(2)}</p>
                        </div>
                    `).join('') : 
                    '<p>Nenhuma venda registrada nesta semana.</p>'}
            `;
        }

        // Atualizar relatórios por método de pagamento
        document.getElementById('today-zelle').textContent = `US$ ${(totais.metodos.zelle || 0).toFixed(2)}`;
        document.getElementById('today-venmo').textContent = `US$ ${(totais.metodos.venmo || 0).toFixed(2)}`;
        document.getElementById('today-cash').textContent = `US$ ${(totais.metodos.cash || 0).toFixed(2)}`;

        // Atualizar gorjetas
        const gorjetasHoje = BarbeariaDados.obterGorjetasDiarias();
        const gorjetasMes = BarbeariaDados.obterGorjetasMensais();
        document.getElementById('today-tips').innerHTML = gorjetasHoje.map(g => `
            <p><strong>${g.nome}:</strong> US$ ${g.gorjeta.toFixed(2)}</p>
        `).join('') || '<p>Nenhuma gorjeta hoje.</p>';
        document.getElementById('month-tips').innerHTML = gorjetasMes.map(g => `
            <p><strong>${g.nome}:</strong> US$ ${g.gorjeta.toFixed(2)}</p>
        `).join('') || '<p>Nenhuma gorjeta no mês.</p>';

        // Atualizar lista de retiradas
        const withdrawalsList = document.getElementById('withdrawals-list');
        if (withdrawalsList) {
            const retiradasHoje = retiradas.filter(r => r.data.split('T')[0] === hoje);
            withdrawalsList.innerHTML = retiradasHoje.length > 0 ? retiradasHoje.map(retirada => `
                <div class="withdrawal-card">
                    <div>
                        <p><strong>Valor:</strong> US$ ${retirada.valor.toFixed(2)}</p>
                        <p><strong>Motivo:</strong> ${retirada.motivo}</p>
                        <p><strong>Data:</strong> ${new Date(retirada.data).toLocaleString()}</p>
                    </div>
                </div>
            `).join('') : '<p>Nenhuma retirada registrada hoje.</p>';
        }

        // Preparar dados para os gráficos
        const ultimosSeteDias = [...Array(7)].map((_, i) => {
            const data = new Date();
            data.setDate(data.getDate() - i);
            return data.toISOString().split('T')[0];
        }).reverse();

        const vendasPorDia = ultimosSeteDias.map(data => ({
            data,
            valor: vendas
                .filter(v => v.data.split('T')[0] === data)
                .reduce((sum, v) => sum + v.valor, 0)
        }));

        // Ranking de barbeiros
        const vendasPorBarbeiro = vendas.reduce((acc, venda) => {
            if (!acc[venda.profissionalId]) {
                acc[venda.profissionalId] = { total: 0, quantidade: 0 };
            }
            acc[venda.profissionalId].total += venda.valor;
            acc[venda.profissionalId].quantidade += 1;
            return acc;
        }, {});

        const rankingBarbeiros = Object.entries(vendasPorBarbeiro)
            .map(([id, dados]) => ({
                profissional: cachedProfissionais.find(p => p.id === id),
                ...dados
            }))
            .sort((a, b) => b.total - a.total);

        const rankingHTML = rankingBarbeiros
            .map((item, index) => `
                <div class="ranking-item">
                    <span class="ranking-position">#${index + 1}</span>
                    <span>${item.profissional?.nome || 'Desconhecido'}</span>
                    <span>US$ ${item.total.toFixed(2)}</span>
                    <span>${item.quantidade} vendas</span>
                </div>
            `)
            .join('');
        document.getElementById('barbers-ranking').innerHTML = rankingHTML;

        // Atualizar gráfico de vendas
        const salesChart = Chart.getChart('sales-chart');
        if (salesChart) {
            salesChart.destroy();
        }
        new Chart(document.getElementById('sales-chart'), {
            type: 'line',
            data: {
                labels: vendasPorDia.map(v => v.data),
                datasets: [{
                    label: 'Vendas por Dia',
                    data: vendasPorDia.map(v => v.valor),
                    borderColor: '#9b59b6',
                    backgroundColor: 'rgba(155, 89, 182, 0.2)',
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Vendas dos Últimos 7 Dias',
                        color: '#fff'
                    },
                    legend: {
                        labels: {
                            color: '#fff'
                        }
                    }
                },
                scales: {
                    y: {
                        ticks: {
                            color: '#fff'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#fff'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    }
                }
            }
        });

        // Atualizar gráfico de barbeiros
        const barbersChart = Chart.getChart('barbers-chart');
        if (barbersChart) {
            barbersChart.destroy();
        }
        new Chart(document.getElementById('barbers-chart'), {
            type: 'bar',
            data: {
                labels: rankingBarbeiros.map(b => b.profissional?.nome || 'Desconhecido'),
                datasets: [{
                    label: 'Total de Vendas',
                    data: rankingBarbeiros.map(b => b.total),
                    backgroundColor: '#9b59b6'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Vendas por Profissional',
                        color: '#fff'
                    },
                    legend: {
                        labels: {
                            color: '#fff'
                        }
                    }
                },
                scales: {
                    y: {
                        ticks: {
                            color: '#fff'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#fff'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    }
                }
            }
        });

        // Atualizar lista de vendas
        const salesList = document.getElementById('financial-sales-list');
        if (salesList) {
            salesList.innerHTML = vendas.reverse().map(venda => {
                const profissional = cachedProfissionais.find(p => p.id === venda.profissionalId);
                const item = venda.tipo === 'servico'
                    ? cachedServicos.find(s => s.id === venda.itemId)
                    : cachedProdutos.find(p => p.id === venda.itemId);

                return `
                    <div class="sale-card">
                        <div>
                            <p><strong>Tipo:</strong> ${venda.tipo === 'servico' ? 'Serviço' : 'Produto'}</p>
                            <p><strong>Item:</strong> ${item?.nome || 'Item desconhecido'}</p>
                            <p><strong>Profissional:</strong> ${profissional?.nome || 'Desconhecido'}</p>
                            <p><strong>Quantidade:</strong> ${venda.quantidade}</p>
                            <p><strong>Valor:</strong> US$ ${venda.valor.toFixed(2)}</p>
                            <p><strong>Gorjeta:</strong> US$ ${(venda.gorjeta || 0).toFixed(2)}</p>
                            <p><strong>Método:</strong> ${formatarMetodoPagamento(venda.metodoPagamento)}</p>
                            <p><strong>Data:</strong> ${new Date(venda.data).toLocaleString()}</p>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    // --- Exportar para PDF ---
    function exportarRelatorio() {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            const vendas = BarbeariaDados.obterVendas();
            const retiradas = BarbeariaDados.obterRetiradas();
            const startDate = document.getElementById('start-date').value || new Date().toISOString().split('T')[0];
            const endDate = document.getElementById('end-date').value || startDate;
            const primeiroDiaMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

            // Calcular a data de início da semana (segunda-feira)
            const hojeDate = new Date();
            const diaSemana = hojeDate.getDay(); // 0 (domingo) a 6 (sábado)
            const primeiroDiaSemana = new Date(hojeDate);
            primeiroDiaSemana.setDate(hojeDate.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1));
            const primeiroDiaSemanaStr = primeiroDiaSemana.toISOString().split('T')[0];

            // Validar datas
            if (new Date(endDate) < new Date(startDate)) {
                throw new Error('A data final não pode ser anterior à data inicial.');
            }

            // Filtrar vendas e retiradas pelo período
            const vendasPeriodo = vendas.filter(v => {
                const dataVenda = v.data.split('T')[0];
                return dataVenda >= startDate && dataVenda <= endDate;
            });
            const retiradasPeriodo = retiradas.filter(r => {
                const dataRetirada = r.data.split('T')[0];
                return dataRetirada >= startDate && dataRetirada <= endDate;
            });

            // Calcular totais
            const totais = vendas.reduce((acc, venda) => {
                const dataVenda = venda.data.split('T')[0];
                if (dataVenda >= startDate && dataVenda <= endDate) {
                    acc.periodo += venda.valor;
                    acc.gorjetas += (venda.gorjeta || 0);
                    acc.metodos[venda.metodoPagamento] = (acc.metodos[venda.metodoPagamento] || 0) + venda.valor;
                }
                if (dataVenda >= primeiroDiaMes) {
                    acc.mes += venda.valor;
                }
                acc.total += venda.valor;
                return acc;
            }, { periodo: 0, mes: 0, total: 0, gorjetas: 0, metodos: {} });

            // Calcular vendas por barbeiro na semana
            const vendasPorBarbeiroSemana = {};
            vendas.forEach(venda => {
                const dataVenda = venda.data.split('T')[0];
                if (dataVenda >= primeiroDiaSemanaStr) {
                    const profissional = cachedProfissionais.find(p => p.id === venda.profissionalId);
                    const nome = profissional ? profissional.nome : 'Desconhecido';
                    if (!vendasPorBarbeiroSemana[venda.profissionalId]) {
                        vendasPorBarbeiroSemana[venda.profissionalId] = { nome, total: 0 };
                    }
                    vendasPorBarbeiroSemana[venda.profissionalId].total += venda.valor;
                }
            });

            // Calcular gorjetas por profissional no período
            const gorjetasPorProfissional = {};
            vendasPeriodo.forEach(venda => {
                if (venda.gorjeta > 0) {
                    const profissional = cachedProfissionais.find(p => p.id === venda.profissionalId);
                    if (profissional) {
                        gorjetasPorProfissional[venda.profissionalId] = {
                            nome: profissional.nome,
                            total: (gorjetasPorProfissional[venda.profissionalId]?.total || 0) + venda.gorjeta
                        };
                    }
                }
            });

            // Configurar o PDF
            doc.setFontSize(16);
            doc.text('Relatório Financeiro - JVBarberShop', 10, 10);
            doc.setFontSize(12);
            doc.text(`Período: ${startDate} a ${endDate}`, 10, 20);

            // Seção: Resumo
            doc.setFontSize(14);
            doc.text('Resumo Financeiro', 10, 30);
            const resumoData = [
                [`Vendas no Período (${startDate} a ${endDate})`, `US$ ${totais.periodo.toFixed(2)}`],
                [`Gorjetas no Período`, `US$ ${totais.gorjetas.toFixed(2)}`],
                ['Vendas no Mês', `US$ ${totais.mes.toFixed(2)}`],
                ['Total de Vendas (Histórico)', `US$ ${totais.total.toFixed(2)}`],
                ['Saldo Atual do Caixa', `US$ ${BarbeariaDados.calcularSaldoCaixa().toFixed(2)}`],
                ['Vendas em Zelle (Período)', `US$ ${(totais.metodos.zelle || 0).toFixed(2)}`],
                ['Vendas em Venmo (Período)', `US$ ${(totais.metodos.venmo || 0).toFixed(2)}`],
                ['Vendas em Cash (Período)', `US$ ${(totais.metodos.cash || 0).toFixed(2)}`]
            ];
            doc.autoTable({
                head: [['Descrição', 'Valor']],
                body: resumoData,
                startY: 35,
                theme: 'grid',
                styles: { fontSize: 10, textColor: [0, 0, 0] },
                headStyles: { fillColor: [156, 89, 182], textColor: [255, 255, 255] }
            });

            // Seção: Vendas por Método de Pagamento
            let finalY = doc.lastAutoTable.finalY + 10;
            doc.setFontSize(14);
            doc.text('Vendas por Método de Pagamento', 10, finalY);
            const vendasPorMetodo = [
                ['Zelle', `US$ ${(totais.metodos.zelle || 0).toFixed(2)}`],
                ['Venmo', `US$ ${(totais.metodos.venmo || 0).toFixed(2)}`],
                ['Cash', `US$ ${(totais.metodos.cash || 0).toFixed(2)}`]
            ];
            doc.autoTable({
                head: [['Método', 'Total']],
                body: vendasPorMetodo,
                startY: finalY + 5,
                theme: 'grid',
                styles: { fontSize: 10, textColor: [0, 0, 0] },
                headStyles: { fillColor: [156, 89, 182], textColor: [255, 255, 255] }
            });

            // Seção: Detalhes das Vendas
            finalY = doc.lastAutoTable.finalY + 10;
            doc.setFontSize(14);
            doc.text('Detalhes das Vendas', 10, finalY);
            const vendasData = vendasPeriodo.map(venda => {
                const profissional = cachedProfissionais.find(p => p.id === venda.profissionalId);
                const item = venda.tipo === 'servico'
                    ? cachedServicos.find(s => s.id === venda.itemId)
                    : cachedProdutos.find(p => p.id === venda.itemId);
                return [
                    venda.tipo === 'servico' ? 'Serviço' : 'Produto',
                    item?.nome || 'Item desconhecido',
                    profissional?.nome || 'Desconhecido',
                    venda.quantidade,
                    `US$ ${venda.valor.toFixed(2)}`,
                    `US$ ${(venda.gorjeta || 0).toFixed(2)}`,
                    formatarMetodoPagamento(venda.metodoPagamento),
                    new Date(venda.data).toLocaleString()
                ];
            });
            doc.autoTable({
                head: [['Tipo', 'Item', 'Profissional', 'Quantidade', 'Valor', 'Gorjeta', 'Método', 'Data']],
                body: vendasData.length > 0 ? vendasData : [['Nenhuma venda no período', '', '', '', '', '', '', '']],
                startY: finalY + 5,
                theme: 'grid',
                styles: { fontSize: 10, textColor: [0, 0, 0] },
                headStyles: { fillColor: [156, 89, 182], textColor: [255, 255, 255] }
            });

            // Seção: Gorjetas por Profissional
            finalY = doc.lastAutoTable.finalY + 10;
            doc.setFontSize(14);
            doc.text('Gorjetas por Profissional', 10, finalY);
            const gorjetasData = Object.values(gorjetasPorProfissional).map(prof => [
                prof.nome,
                `US$ ${prof.total.toFixed(2)}`
            ]);
            doc.autoTable({
                head: [['Profissional', 'Total de Gorjetas']],
                body: gorjetasData.length > 0 ? gorjetasData : [['Nenhuma gorjeta registrada', 'US$ 0.00']],
                startY: finalY + 5,
                theme: 'grid',
                styles: { fontSize: 10, textColor: [0, 0, 0] },
                headStyles: { fillColor: [156, 89, 182], textColor: [255, 255, 255] }
            });

            // Seção: Vendas por Profissional na Semana
            finalY = doc.lastAutoTable.finalY + 10;
            doc.setFontSize(14);
            doc.text(`Vendas por Profissional na Semana (a partir de ${primeiroDiaSemanaStr})`, 10, finalY);
            const vendasSemanaData = Object.values(vendasPorBarbeiroSemana).map(barbeiro => [
                barbeiro.nome,
                `US$ ${barbeiro.total.toFixed(2)}`
            ]);
            doc.autoTable({
                head: [['Profissional', 'Total de Vendas']],
                body: vendasSemanaData.length > 0 ? vendasSemanaData : [['Nenhuma venda registrada na semana', 'US$ 0.00']],
                startY: finalY + 5,
                theme: 'grid',
                styles: { fontSize: 10, textColor: [0, 0, 0] },
                headStyles: { fillColor: [156, 89, 182], textColor: [255, 255, 255] }
            });

            // Seção: Retiradas
            finalY = doc.lastAutoTable.finalY + 10;
            doc.setFontSize(14);
            doc.text('Retiradas', 10, finalY);
            const retiradasData = retiradasPeriodo.map(retirada => [
                `US$ ${retirada.valor.toFixed(2)}`,
                retirada.motivo,
                new Date(retirada.data).toLocaleString()
            ]);
            doc.autoTable({
                head: [['Valor', 'Motivo', 'Data']],
                body: retiradasData.length > 0 ? retiradasData : [['Nenhuma retirada no período', '', '']],
                startY: finalY + 5,
                theme: 'grid',
                styles: { fontSize: 10, textColor: [0, 0, 0] },
                headStyles: { fillColor: [156, 89, 182], textColor: [255, 255, 255] }
            });

            // Gerar e baixar o arquivo
            const dataInicio = startDate.replace(/-/g, '') || 'sem_data';
            const dataFim = endDate.replace(/-/g, '') || 'sem_data';
            doc.save(`Relatorio_JVBarberShop_${dataInicio}_${dataFim}.pdf`);
            mostrarFeedback('Relatório exportado com sucesso!', 'success');
        } catch (e) {
            console.error('Erro ao exportar para PDF:', e);
            mostrarFeedback('Erro ao exportar relatório: ' + e.message, 'error');
        }
    }

    // Associar evento ao botão de exportação
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportarRelatorio);
    }

    // Inicializar
    inicializarNavegacao();
    inicializarBackup();
    inicializarAgendamentos();
    inicializarCaixa();
    inicializarRetiradas();
    inicializarVendas();
    inicializarClientes();
    inicializarServicos();
    inicializarProfissionais();
    inicializarProdutos();
    atualizarDashboard();
    atualizarListaClientes();
    atualizarListaServicos();
    atualizarListaProfissionais();
    atualizarListaProdutos();
    atualizarListaVendas();
    atualizarFinanceiro();
    atualizarStatusCaixa();
});