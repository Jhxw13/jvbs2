document.addEventListener('DOMContentLoaded', () => {
    // Inicializar dados
    BarbeariaDados.inicializar();

    // --- Navegação ---
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

    // --- Agendamentos ---
    const barberSelect = document.getElementById('barber');
    BarbeariaDados.barbeiros.forEach(barbeiro => {
        const option = document.createElement('option');
        option.value = barbeiro.id;
        option.textContent = barbeiro.nome;
        barberSelect.appendChild(option);
    });

    const form = document.getElementById('appointment-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const appointment = {
                clientName: document.getElementById('client-name').value,
                date: document.getElementById('date').value,
                time: document.getElementById('time').value,
                service: document.getElementById('service').value,
                barberId: document.getElementById('barber').value
            };
            BarbeariaDados.adicionarAgendamento(appointment);
            atualizarDashboard();
            
            const mensagem = `Olá ${appointment.clientName}! Seu agendamento foi confirmado:\n\nData: ${appointment.date}\nHorário: ${appointment.time}\nServiço: ${appointment.service}\n\nAguardamos você!`;
            const mensagemFormatada = encodeURIComponent(mensagem);
            
            const cliente = BarbeariaDados.obterClientes().find(c => c.nome === appointment.clientName);
            if (cliente && cliente.telefone) {
                const telefone = cliente.telefone.replace(/\D/g, '');
                window.open(`https://wa.me/55${telefone}?text=${mensagemFormatada}`, '_blank');
            }
            
            form.reset();
        });
    }

    // --- PDV: Controle do Caixa Diário ---
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
            cashStatus.textContent = `Caixa Aberto (R$ ${caixa.valorInicial.toFixed(2)})`;
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
        cashBalanceDisplay.textContent = saldo.toFixed(2);
    }

    function fecharCaixa() {
        const caixa = BarbeariaDados.obterCaixa();
        if (!caixa || !caixa.aberto) {
            alert('O caixa já está fechado ou não foi aberto hoje.');
            return;
        }
        const saldoFinal = BarbeariaDados.calcularSaldoCaixa();
        BarbeariaDados.fecharCaixa(saldoFinal);
        atualizarStatusCaixa();
        atualizarFinanceiro();
        alert(`Caixa fechado com sucesso! Saldo final: R$ ${saldoFinal.toFixed(2)}`);
    }

    if (cashForm) {
        cashForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const valorInicial = document.getElementById('cash-initial').value;
            if (valorInicial >= 0) {
                BarbeariaDados.abrirCaixa(valorInicial);
                atualizarStatusCaixa();
                cashForm.reset();
            } else {
                alert('Insira um valor inicial válido.');
            }
        });
    }

    if (closeCashBtn) {
        closeCashBtn.addEventListener('click', fecharCaixa);
    }

    // --- PDV: Controle de Retiradas ---
    const withdrawalForm = document.getElementById('withdrawal-form');
    if (withdrawalForm) {
        withdrawalForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const valor = parseFloat(document.getElementById('withdrawal-amount').value);
            const motivo = document.getElementById('withdrawal-reason').value;
            const saldo = BarbeariaDados.calcularSaldoCaixa();

            if (!BarbeariaDados.obterCaixa()?.aberto) {
                alert('O caixa deve estar aberto para registrar uma retirada.');
                return;
            }
            if (valor <= 0) {
                alert('Insira um valor de retirada válido.');
                return;
            }
            if (valor > saldo) {
                alert(`Saldo insuficiente! Saldo disponível: R$ ${saldo.toFixed(2)}.`);
                return;
            }
            if (!motivo.trim()) {
                alert('Por favor, informe o motivo da retirada.');
                return;
            }

            BarbeariaDados.adicionarRetirada({ valor, motivo });
            atualizarSaldoCaixa();
            atualizarFinanceiro();
            withdrawalForm.reset();
            alert('Retirada registrada com sucesso!');
        });
    }

    // --- PDV: Controle de Vendas ---
    let selectedItems = [];
    let totalVenda = 0;

    const saleServiceSelect = document.getElementById('sale-service');
    const saleProductSelect = document.getElementById('sale-product');
    const saleProfessionalSelect = document.getElementById('sale-professional');
    const selectedItemsDiv = document.getElementById('selected-items');
    const saleTotalSpan = document.getElementById('sale-total');

    function atualizarTotal() {
        totalVenda = selectedItems.reduce((total, item) => total + item.valor, 0);
        saleTotalSpan.textContent = totalVenda.toFixed(2);
    }

    function atualizarItensSelecionados() {
        selectedItemsDiv.innerHTML = selectedItems.map((item, index) => `
            <div class="selected-item">
                <p>${item.tipo === 'servico' ? 'Serviço' : 'Produto'}: ${item.nome} - 
                   Qtd: ${item.quantidade} - R$ ${item.valor.toFixed(2)}</p>
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
        BarbeariaDados.obterServicos().forEach(servico => {
            const option = document.createElement('option');
            option.value = servico.id;
            option.textContent = `${servico.nome} - R$ ${servico.preco.toFixed(2)}`;
            saleServiceSelect.appendChild(option);
        });
    }

    if (saleProductSelect) {
        BarbeariaDados.obterProdutos().forEach(produto => {
            const option = document.createElement('option');
            option.value = produto.id;
            option.textContent = `${produto.nome} - R$ ${produto.preco.toFixed(2)}`;
            saleProductSelect.appendChild(option);
        });
    }

    if (saleProfessionalSelect) {
        BarbeariaDados.obterProfissionais().forEach(profissional => {
            const option = document.createElement('option');
            option.value = profissional.id;
            option.textContent = profissional.nome;
            saleProfessionalSelect.appendChild(option);
        });
    }

    document.getElementById('add-service').addEventListener('click', () => {
        const servicoId = saleServiceSelect.value;
        if (servicoId) {
            const servico = BarbeariaDados.obterServicos().find(s => s.id === servicoId);
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
            const produto = BarbeariaDados.obterProdutos().find(p => p.id === produtoId);
            if (produto.estoque < quantidade) {
                alert(`Estoque insuficiente! Disponível: ${produto.estoque} unidades de ${produto.nome}.`);
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

    const salesForm = document.getElementById('sales-form');
    if (salesForm) {
        salesForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const profissionalId = document.getElementById('sale-professional').value;
            const metodoPagamento = document.getElementById('payment-method').value;
            
            if (!profissionalId || selectedItems.length === 0 || !metodoPagamento) {
                alert('Selecione um profissional, método de pagamento e pelo menos um item para a venda.');
                return;
            }

            let estoqueValido = true;
            selectedItems.forEach(item => {
                if (item.tipo === 'produto') {
                    const produto = BarbeariaDados.obterProdutos().find(p => p.id === item.id);
                    if (produto.estoque < item.quantidade) {
                        alert(`Estoque insuficiente para ${produto.nome}! Disponível: ${produto.estoque} unidades.`);
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
                    metodoPagamento: metodoPagamento
                };
                
                if (item.tipo === 'servico') {
                    BarbeariaDados.registrarCorte(profissionalId);
                } else if (item.tipo === 'produto') {
                    const produto = BarbeariaDados.obterProdutos().find(p => p.id === item.id);
                    produto.estoque -= item.quantidade;
                }
                
                BarbeariaDados.adicionarVenda(venda);
            });

            selectedItems = [];
            atualizarItensSelecionados();
            atualizarListaVendas();
            salesForm.reset();
            atualizarDashboard();
            atualizarListaProdutos();
            atualizarFinanceiro();
            atualizarSaldoCaixa();
        });
    }

    function atualizarListaVendas() {
        const salesList = document.getElementById('sales-list');
        if (salesList) {
            const vendas = BarbeariaDados.obterVendas();
            salesList.innerHTML = `
                <h2>Vendas Realizadas</h2>
                ${vendas.map(venda => {
                    const profissional = BarbeariaDados.obterProfissionais().find(p => p.id === venda.profissionalId);
                    const item = venda.tipo === 'servico' 
                        ? BarbeariaDados.obterServicos().find(s => s.id === venda.itemId)
                        : BarbeariaDados.obterProdutos().find(p => p.id === venda.itemId);
                    
                    return `
                        <div class="sale-card">
                            <div>
                                <p><strong>Tipo:</strong> ${venda.tipo === 'servico' ? 'Serviço' : 'Produto'}</p>
                                <p><strong>Item:</strong> ${item.nome}</p>
                                <p><strong>Profissional:</strong> ${profissional.nome}</p>
                                <p><strong>Quantidade:</strong> ${venda.quantidade}</p>
                                <p><strong>Valor:</strong> R$ ${venda.valor.toFixed(2)}</p>
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
            'dinheiro': 'Dinheiro',
            'cartao_credito': 'Cartão de Crédito',
            'cartao_debito': 'Cartão de Débito',
            'pix': 'Pix'
        };
        return metodos[metodo] || metodo;
    }

    // --- Dashboard ---
    function atualizarDashboard() {
        const vendas = BarbeariaDados.obterVendas();
        const profissionais = BarbeariaDados.obterProfissionais();
        
        const estatisticasPorBarbeiro = profissionais.map(profissional => {
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
        document.getElementById('total-revenue').textContent = `R$ ${totalReceita.toFixed(2)}`;

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
                    backgroundColor: ['#9b59b6', '#3498db', '#e74c3c', '#2ecc71']
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

        const appointmentsList = document.getElementById('appointments-list');
        if (appointmentsList) {
            const agendamentos = BarbeariaDados.obterAgendamentos();
            appointmentsList.innerHTML = `
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
        }
    }

    window.registrarCorte = (barbeiroId) => {
        BarbeariaDados.registrarCorte(barbeiroId);
        atualizarDashboard();
    };

    window.deleteAppointment = (id) => {
        BarbeariaDados.removerAgendamento(id);
        atualizarDashboard();
    };

    // --- Clientes ---
    const clientForm = document.getElementById('client-form');
    if (clientForm) {
        clientForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const telefone = document.getElementById('new-client-phone').value;
            const telefoneRegex = /^\+1 \(\d{3}\) \d{3}-\d{4}$/;
            
            if (!telefoneRegex.test(telefone)) {
                alert('Por favor, insira o telefone no formato: +1 (508) 939-1881');
                return;
            }

            const cliente = {
                nome: document.getElementById('new-client-name').value,
                telefone: telefone,
                email: document.getElementById('new-client-email').value
            };
            BarbeariaDados.adicionarCliente(cliente);
            atualizarListaClientes();
            clientForm.reset();
        });
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
                            <p><strong>Telefone:</strong> ${cliente.telefone}</p>
                            <p><strong>Email:</strong> ${cliente.email}</p>
                        </div>
                        <button onclick="removerCliente('${cliente.id}')">Remover</button>
                    </div>
                `).join('')}
            `;
        }
    }

    window.removerCliente = (id) => {
        BarbeariaDados.removerCliente(id);
        atualizarListaClientes();
    };

    // --- Serviços ---
    const serviceForm = document.getElementById('service-form');
    if (serviceForm) {
        serviceForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const servico = {
                nome: document.getElementById('service-name').value,
                preco: parseFloat(document.getElementById('service-price').value),
                descricao: document.getElementById('service-description').value
            };
            BarbeariaDados.adicionarServico(servico);
            atualizarListaServicos();
            serviceForm.reset();
        });
    }

    function atualizarListaServicos() {
        const servicesList = document.getElementById('services-list');
        if (servicesList) {
            const servicos = BarbeariaDados.obterServicos();
            servicesList.innerHTML = `
                <h2>Serviços Cadastrados</h2>
                ${servicos.map(servico => `
                    <div class="service-card">
                        <div>
                            <p><strong>Nome:</strong> ${servico.nome}</p>
                            <p><strong>Preço:</strong> R$ ${servico.preco.toFixed(2)}</p>
                            <p><strong>Descrição:</strong> ${servico.descricao}</p>
                        </div>
                        <button onclick="removerServico('${servico.id}')">Remover</button>
                    </div>
                `).join('')}
            `;
        }
    }

    window.removerServico = (id) => {
        BarbeariaDados.removerServico(id);
        atualizarListaServicos();
    };

    // --- Profissionais ---
    const professionalForm = document.getElementById('professional-form');
    if (professionalForm) {
        professionalForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const profissional = {
                nome: document.getElementById('professional-name').value,
                telefone: document.getElementById('professional-phone').value,
                email: document.getElementById('professional-email').value,
                especialidade: document.getElementById('professional-specialty').value
            };
            BarbeariaDados.adicionarProfissional(profissional);
            atualizarListaProfissionais();
            professionalForm.reset();
        });
    }

    function atualizarListaProfissionais() {
        const professionalsList = document.getElementById('professionals-list');
        if (professionalsList) {
            const profissionais = BarbeariaDados.obterProfissionais();
            professionalsList.innerHTML = `
                <h2>Profissionais Cadastrados</h2>
                ${profissionais.map(profissional => `
                    <div class="professional-card">
                        <div>
                            <p><strong>Nome:</strong> ${profissional.nome}</p>
                            <p><strong>Telefone:</strong> ${profissional.telefone}</p>
                            <p><strong>Email:</strong> ${profissional.email}</p>
                            <p><strong>Especialidade:</strong> ${profissional.especialidade}</p>
                        </div>
                        <button onclick="removerProfissional('${profissional.id}')">Remover</button>
                    </div>
                `).join('')}
            `;
        }
    }

    window.removerProfissional = (id) => {
        BarbeariaDados.removerProfissional(id);
        atualizarListaProfissionais();
    };

    // --- Produtos ---
    const productForm = document.getElementById('product-form');
    if (productForm) {
        productForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const produto = {
                nome: document.getElementById('product-name').value,
                preco: parseFloat(document.getElementById('product-price').value),
                estoque: parseInt(document.getElementById('product-stock').value),
                descricao: document.getElementById('product-description').value
            };
            BarbeariaDados.adicionarProduto(produto);
            atualizarListaProdutos();
            productForm.reset();
        });
    }

    function atualizarListaProdutos() {
        const productsList = document.getElementById('products-list');
        if (productsList) {
            const produtos = BarbeariaDados.obterProdutos();
            productsList.innerHTML = `
                <h2>Produtos vor Cadastrados</h2>
                ${produtos.map(produto => `
                    <div class="product-card">
                        <div>
                            <p><strong>Nome:</strong> ${produto.nome}</p>
                            <p><strong>Preço:</strong> R$ ${produto.preco.toFixed(2)}</p>
                            <p><strong>Estoque:</strong> ${produto.estoque}</p>
                            <p><strong>Descrição:</strong> ${produto.descricao}</p>
                        </div>
                        <button onclick="removerProduto('${produto.id}')">Remover</button>
                    </div>
                `).join('')}
            `;
        }
    }

    window.removerProduto = (id) => {
        BarbeariaDados.removerProduto(id);
        atualizarListaProdutos();
    };

    // --- Financeiro ---
    function atualizarFinanceiro() {
        const vendas = BarbeariaDados.obterVendas();
        const retiradas = BarbeariaDados.obterRetiradas();
        const hoje = new Date().toISOString().split('T')[0];
        const primeiroDiaMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

        // Calcular totais
        const totais = vendas.reduce((acc, venda) => {
            const dataVenda = venda.data.split('T')[0];
            if (dataVenda === hoje) {
                acc.hoje += venda.valor;
                acc.metodos[venda.metodoPagamento] = (acc.metodos[venda.metodoPagamento] || 0) + venda.valor;
            }
            if (venda.data >= primeiroDiaMes) {
                acc.mes += venda.valor;
            }
            acc.total += venda.valor;
            return acc;
        }, { hoje: 0, mes: 0, total: 0, metodos: {} });

        // Atualizar cards principais
        document.getElementById('today-sales').textContent = `R$ ${totais.hoje.toFixed(2)}`;
        document.getElementById('month-sales').textContent = `R$ ${totais.mes.toFixed(2)}`;
        document.getElementById('total-sales').textContent = `R$ ${totais.total.toFixed(2)}`;
        document.getElementById('cash-balance').textContent = `R$ ${BarbeariaDados.calcularSaldoCaixa().toFixed(2)}`;

        // Atualizar relatórios por método de pagamento
        document.getElementById('today-dinheiro').textContent = `R$ ${(totais.metodos.dinheiro || 0).toFixed(2)}`;
        document.getElementById('today-cartao_credito').textContent = `R$ ${(totais.metodos.cartao_credito || 0).toFixed(2)}`;
        document.getElementById('today-cartao_debito').textContent = `R$ ${(totais.metodos.cartao_debito || 0).toFixed(2)}`;
        document.getElementById('today-pix').textContent = `R$ ${(totais.metodos.pix || 0).toFixed(2)}`;

        // Atualizar lista de retiradas
        const withdrawalsList = document.getElementById('withdrawals-list');
        if (withdrawalsList) {
            const retiradasHoje = retiradas.filter(r => r.data.split('T')[0] === hoje);
            withdrawalsList.innerHTML = retiradasHoje.length > 0 ? retiradasHoje.map(retirada => `
                <div class="withdrawal-card">
                    <div>
                        <p><strong>Valor:</strong> R$ ${retirada.valor.toFixed(2)}</p>
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
                profissional: BarbeariaDados.obterProfissionais().find(p => p.id === id),
                ...dados
            }))
            .sort((a, b) => b.total - a.total);

        const rankingHTML = rankingBarbeiros
            .map((item, index) => `
                <div class="ranking-item">
                    <span class="ranking-position">#${index + 1}</span>
                    <span>${item.profissional.nome}</span>
                    <span>R$ ${item.total.toFixed(2)}</span>
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
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Vendas dos Últimos 7 Dias'
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
                labels: rankingBarbeiros.map(b => b.profissional.nome),
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
                        text: 'Vendas por Profissional'
                    }
                }
            }
        });

        // Atualizar lista de vendas
        const salesList = document.getElementById('financial-sales-list');
        salesList.innerHTML = vendas.reverse().map(venda => {
            const profissional = BarbeariaDados.obterProfissionais().find(p => p.id === venda.profissionalId);
            const item = venda.tipo === 'servico'
                ? BarbeariaDados.obterServicos().find(s => s.id === venda.itemId)
                : BarbeariaDados.obterProdutos().find(p => p.id === venda.itemId);
            
            return `
                <div class="sale-card">
                    <div>
                        <p><strong>Tipo:</strong> ${venda.tipo === 'servico' ? 'Serviço' : 'Produto'}</p>
                        <p><strong>Item:</strong> ${item.nome}</p>
                        <p><strong>Profissional:</strong> ${profissional.nome}</p>
                        <p><strong>Quantidade:</strong> ${venda.quantidade}</p>
                        <p><strong>Valor:</strong> R$ ${venda.valor.toFixed(2)}</p>
                        <p><strong>Método:</strong> ${formatarMetodoPagamento(venda.metodoPagamento)}</p>
                        <p><strong>Data:</strong> ${new Date(venda.data).toLocaleString()}</p>
                    </div>
                </div>
            `;
        }).join('');
    }

    // --- Exportar para PDF ---
    function showFeedback(message, isError = false) {
        const feedback = document.getElementById('feedback');
        feedback.textContent = message;
        feedback.className = `feedback ${isError ? 'error' : 'success'}`;
        feedback.style.display = 'block';
        setTimeout(() => {
            feedback.style.display = 'none';
        }, 3000);
    }

    function exportarRelatorio() {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            const vendas = BarbeariaDados.obterVendas();
            const retiradas = BarbeariaDados.obterRetiradas();
            const startDate = document.getElementById('start-date').value || new Date().toISOString().split('T')[0];
            const endDate = document.getElementById('end-date').value || startDate;
            const primeiroDiaMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

            // Validar datas
            if (new Date(endDate) < new Date(startDate)) {
                showFeedback('A data final não pode ser anterior à data inicial.', true);
                return;
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
                    acc.metodos[venda.metodoPagamento] = (acc.metodos[venda.metodoPagamento] || 0) + venda.valor;
                }
                if (venda.data >= primeiroDiaMes) {
                    acc.mes += venda.valor;
                }
                acc.total += venda.valor;
                return acc;
            }, { periodo: 0, mes: 0, total: 0, metodos: {} });

            // Configurar o PDF
            doc.setFontSize(16);
            doc.text('Relatório JVBarberShop', 10, 10);
            doc.setFontSize(12);
            doc.text(`Período: ${startDate} a ${endDate}`, 10, 20);

            // Seção: Resumo
            doc.setFontSize(14);
            doc.text('Resumo', 10, 30);
            const resumoData = [
                [`Vendas (${startDate} a ${endDate})`, `R$ ${totais.periodo.toFixed(2)}`],
                ['Vendas no Mês', `R$ ${totais.mes.toFixed(2)}`],
                ['Total de Vendas', `R$ ${totais.total.toFixed(2)}`],
                ['Saldo do Caixa', `R$ ${BarbeariaDados.calcularSaldoCaixa().toFixed(2)}`],
                ['Vendas em Dinheiro (Período)', `R$ ${(totais.metodos.dinheiro || 0).toFixed(2)}`],
                ['Vendas em Cartão de Crédito (Período)', `R$ ${(totais.metodos.cartao_credito || 0).toFixed(2)}`],
                ['Vendas em Cartão de Débito (Período)', `R$ ${(totais.metodos.cartao_debito || 0).toFixed(2)}`],
                ['Vendas em Pix (Período)', `R$ ${(totais.metodos.pix || 0).toFixed(2)}`]
            ];
            doc.autoTable({
                head: [['Descrição', 'Valor']],
                body: resumoData,
                startY: 35,
                theme: 'grid',
                styles: { fontSize: 10, textColor: [0, 0, 0] },
                headStyles: { fillColor: [156, 89, 182], textColor: [255, 255, 255] }
            });

            // Seção: Vendas
            let finalY = doc.lastAutoTable.finalY + 10;
            doc.setFontSize(14);
            doc.text('Vendas', 10, finalY);
            const vendasData = vendasPeriodo.map(venda => {
                const profissional = BarbeariaDados.obterProfissionais().find(p => p.id === venda.profissionalId);
                const item = venda.tipo === 'servico'
                    ? BarbeariaDados.obterServicos().find(s => s.id === venda.itemId)
                    : BarbeariaDados.obterProdutos().find(p => p.id === venda.itemId);
                return [
                    venda.tipo === 'servico' ? 'Serviço' : 'Produto',
                    item.nome,
                    profissional.nome,
                    venda.quantidade,
                    `R$ ${venda.valor.toFixed(2)}`,
                    formatarMetodoPagamento(venda.metodoPagamento),
                    new Date(venda.data).toLocaleString()
                ];
            });
            doc.autoTable({
                head: [['Tipo', 'Item', 'Profissional', 'Quantidade', 'Valor', 'Método', 'Data']],
                body: vendasData,
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
                `R$ ${retirada.valor.toFixed(2)}`,
                retirada.motivo,
                new Date(retirada.data).toLocaleString()
            ]);
            doc.autoTable({
                head: [['Valor', 'Motivo', 'Data']],
                body: retiradasData,
                startY: finalY + 5,
                theme: 'grid',
                styles: { fontSize: 10, textColor: [0, 0, 0] },
                headStyles: { fillColor: [156, 89, 182], textColor: [255, 255, 255] }
            });

            // Gerar e baixar o arquivo
            const dataInicio = startDate.replace(/-/g, '') || 'sem_data';
            const dataFim = endDate.replace(/-/g, '') || 'sem_data';
            doc.save(`Relatorio_JVBarberShop_${dataInicio}_${dataFim}.pdf`);
            showFeedback('Relatório exportado com sucesso!');
        } catch (e) {
            console.error('Erro ao exportar para PDF:', e);
            showFeedback('Erro ao exportar relatório: ' + e.message, true);
        }
    }

    // Associar evento ao botão de exportação
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportarRelatorio);
    }

    // Inicializar
    atualizarDashboard();
    atualizarListaClientes();
    atualizarListaServicos();
    atualizarListaProfissionais();
    atualizarListaProdutos();
    atualizarListaVendas();
    atualizarFinanceiro();
    atualizarStatusCaixa();
});