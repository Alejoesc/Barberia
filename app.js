// Estado inicial
let state = {
    usd: { ingresos: 0, gastos: 0, total: 0 },
    ves: { ingresos: 0, gastos: 0, total: 0 },
    clientes: 0,
    movimientos: [],
    tipoActual: 'ingreso'
};

const formateaUSD = (num) => `$${parseFloat(num).toFixed(2)}`;
const formateaVES = (num) => `${parseFloat(num).toFixed(2)} Bs`;
const obtenerFechaISO = () => new Date().toISOString().split('T')[0];

document.getElementById('fecha-hoy').textContent = new Date().toLocaleDateString('es-VE');
document.getElementById('filtro-desde').value = obtenerFechaISO();
document.getElementById('filtro-hasta').value = obtenerFechaISO();

// --- TABS (INGRESOS / GASTOS) ---
function setTab(tipo) {
    state.tipoActual = tipo;
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelector(`.tab[data-type="${tipo}"]`).classList.add('active');

    const btn = document.getElementById('btn-submit');
    if(tipo === 'gasto') {
        btn.style.background = 'var(--red)';
        btn.style.color = 'white';
        btn.textContent = 'Registrar Gasto';
    } else {
        btn.style.background = 'var(--gold)';
        btn.style.color = 'black';
        btn.textContent = 'Registrar Ingreso';
    }
}

// --- REGISTRO PRINCIPAL ---
document.getElementById('registro-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const moneda = document.getElementById('moneda').value;
    const monto = parseFloat(document.getElementById('monto').value);
    const concepto = document.getElementById('concepto').value;
    
    if (isNaN(monto) || monto <= 0) return alert("Monto inválido");
    agregarMovimiento(state.tipoActual, moneda, monto, concepto);
    
    document.getElementById('monto').value = '';
    document.getElementById('concepto').value = '';
});

// --- ACCESOS RÁPIDOS ---
function registroRapido(montoBase, moneda, concepto) {
    let montoFinal = montoBase;
    if (moneda === 'ves') {
        const tasaBCV = parseFloat(document.getElementById('tasa-bcv').value);
        if (isNaN(tasaBCV) || tasaBCV <= 0) {
            alert("Espera a que cargue la Tasa BCV o colócala manualmente.");
            return;
        }
        montoFinal = montoBase * tasaBCV;
    }
    agregarMovimiento('ingreso', moneda, montoFinal, concepto);
    state.clientes++;
    document.getElementById('client-count').textContent = state.clientes;
}

function agregarMovimiento(tipo, moneda, monto, concepto) {
    if (tipo === 'ingreso') {
        state[moneda].ingresos += monto;
        state[moneda].total += monto;
    } else {
        state[moneda].gastos += monto;
        state[moneda].total -= monto;
    }

    state.movimientos.unshift({ 
        id: Date.now(), tipo, moneda, monto, concepto, 
        fecha: obtenerFechaISO(),
        hora: new Date().toLocaleTimeString('es-VE', {hour: '2-digit', minute:'2-digit'}) 
    });
    actualizarUI();
}

function actualizarUI() {
    document.getElementById('total-usd').textContent = formateaUSD(state.usd.total);
    document.getElementById('ingresos-usd').textContent = formateaUSD(state.usd.ingresos);
    document.getElementById('gastos-usd').textContent = formateaUSD(state.usd.gastos);

    document.getElementById('total-ves').textContent = formateaVES(state.ves.total);
    document.getElementById('ingresos-ves').textContent = formateaVES(state.ves.ingresos);
    document.getElementById('gastos-ves').textContent = formateaVES(state.ves.gastos);

    const lista = document.getElementById('lista-movimientos');
    lista.innerHTML = '';
    if (state.movimientos.length === 0) {
        lista.innerHTML = '<p class="empty-state">No hay movimientos hoy</p>';
        return;
    }

    state.movimientos.slice(0, 15).forEach(mov => {
        const esIngreso = mov.tipo === 'ingreso';
        const colorClass = esIngreso ? 'text-green' : 'text-red';
        const montoStr = mov.moneda === 'usd' ? formateaUSD(mov.monto) : formateaVES(mov.monto);

        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = `
            <div class="history-info">
                <strong>${mov.concepto}</strong>
                <span>${mov.fecha} - ${mov.hora} • ${mov.moneda.toUpperCase()}</span>
            </div>
            <div class="history-amount ${colorClass}">${esIngreso ? '+' : '-'} ${montoStr}</div>
        `;
        lista.appendChild(div);
    });
}

// --- REPORTES ---
function setFiltroMesActual() {
    const hoy = new Date();
    document.getElementById('filtro-desde').value = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
    document.getElementById('filtro-hasta').value = obtenerFechaISO();
    consultarPeriodo();
}

function setFiltroHoy() {
    document.getElementById('filtro-desde').value = obtenerFechaISO();
    document.getElementById('filtro-hasta').value = obtenerFechaISO();
    consultarPeriodo();
}

function filtrarMovimientos() {
    const desde = document.getElementById('filtro-desde').value;
    const hasta = document.getElementById('filtro-hasta').value;
    if(!desde || !hasta) return state.movimientos;
    return state.movimientos.filter(m => m.fecha >= desde && m.fecha <= hasta);
}

function consultarPeriodo() {
    const filtrados = filtrarMovimientos();
    let res = { usd: { ing:0, gas:0 }, ves: { ing:0, gas:0 } };

    filtrados.forEach(m => {
        if(m.tipo === 'ingreso') res[m.moneda].ing += m.monto;
        else res[m.moneda].gas += m.monto;
    });

    document.getElementById('res-ing-usd').textContent = formateaUSD(res.usd.ing);
    document.getElementById('res-ing-ves').textContent = formateaVES(res.ves.ing);
    document.getElementById('res-gas-usd').textContent = formateaUSD(res.usd.gas);
    document.getElementById('res-gas-ves').textContent = formateaVES(res.ves.gas);
    document.getElementById('resumen-filtro').classList.remove('hidden');
}

function generarPDF() {
    if (!window.jspdf) return alert("La librería PDF está cargando.");
    const filtrados = filtrarMovimientos();
    if(filtrados.length === 0) return alert("No hay registros en esta fecha.");

    const doc = new window.jspdf.jsPDF();
    const desde = document.getElementById('filtro-desde').value;
    const hasta = document.getElementById('filtro-hasta').value;

    doc.setFontSize(18);
    doc.text("Reporte BarberControl", 14, 20);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Período: ${desde} al ${hasta}`, 14, 28);
    
    doc.autoTable({
        startY: 35,
        head: [['Fecha', 'Hora', 'Tipo', 'Concepto', 'Moneda', 'Monto']],
        body: filtrados.map(m => [m.fecha, m.hora, m.tipo.toUpperCase(), m.concepto, m.moneda.toUpperCase(), m.monto.toFixed(2)]),
        theme: 'grid',
        headStyles: { fillColor: [245, 158, 11] } // Dorado
    });
    doc.save(`Finanzas_${desde}_al_${hasta}.pdf`);
}

// --- LÓGICA DE TASA BCV VENEZOLANA ---
async function obtenerTasasBCV() {
    const inputDolar = document.getElementById('tasa-bcv');
    const inputEuro = document.getElementById('tasa-euro');
    const textoFecha = document.getElementById('tasa-fecha');
    const textoVigencia = document.getElementById('tasa-vigencia');

    inputDolar.placeholder = 'Cargando...';
    textoFecha.textContent = 'Consultando BCV...';
    textoVigencia.textContent = '';

    try {
        const resDolar = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
        const dataDolar = await resDolar.json();
        
        const resEuro = await fetch('https://ve.dolarapi.com/v1/euros/oficial');
        const dataEuro = await resEuro.json();
        
        inputDolar.value = dataDolar.promedio;
        inputEuro.value = dataEuro.promedio;

        const fechaObj = new Date(dataDolar.fechaActualizacion);
        const hoy = new Date();
        const diaSemana = hoy.getDay(); // 0: Dom, 1: Lun... 6: Sab
        
        let msjVigencia = "Válida para Hoy";
        
        // Lógica de fin de semana / feriados bancarios
        if (diaSemana === 6 || diaSemana === 0) {
            msjVigencia = "Válida para el Fin de Semana y Próx. Día Hábil";
        } else if (diaSemana === 5 && hoy.getHours() >= 14) {
            msjVigencia = "Válida para el Fin de Semana y Próx. Día Hábil";
        }

        textoFecha.textContent = `Fecha de la tasa: ${fechaObj.toLocaleDateString('es-VE')}`;
        textoVigencia.textContent = `(${msjVigencia})`;

    } catch (error) {
        inputDolar.placeholder = 'Error';
        textoFecha.textContent = "Error de conexión. Ingresa manual.";
    }
}

window.addEventListener('DOMContentLoaded', obtenerTasasBCV);
document.getElementById('btn-actualizar-tasas').addEventListener('click', obtenerTasasBCV);
setInterval(obtenerTasasBCV, 12 * 60 * 60 * 1000);