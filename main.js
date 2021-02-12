import Translate from './translate.js';

let cartas;
let cantidad_jugadores = 0;
let carta_desconocida;
let corona;

let crear_torneo;
let sortear_cartas;

let loading_bar;
let porcentaje_cargado = 0;
let timer_ocultar_barra;

let random_seed;

window.addEventListener('load', () => {
    const primer_jugador = document.querySelector('.jugador');

    primer_jugador.addEventListener('input', modificaJugador);
    primer_jugador.addEventListener('keydown', avanzarSiguienteJugador);

    crear_torneo = document.querySelector('#crear-torneo');
    sortear_cartas = document.querySelector('#sortear-cartas');
    loading_bar = document.querySelector('.loading-bar');

    crear_torneo.addEventListener('click', crearTorneo);
    sortear_cartas.addEventListener('click', sortearCartas);

    // Preparamos la carta con signo de pregunta
    carta_desconocida = new Image();
    carta_desconocida.src = 'images/unknown-card.png';
    carta_desconocida.dataset.index = -1;
    carta_desconocida.classList.add('expand');

    // Preparamos la corona para el ganador
    corona = new Image();
    corona.src = 'images/crown.png';
    corona.classList.add('corona');

    // Indicamos que estamos cargando
    agregarPorcentajeDeCarga(5);

    // Para eventos e indicationes específicas
    window.esDispositivoMovil = getDispositivoMovil();

    // Para la seed
    definirStringHash();
});

function modificaJugador(event) {
    const jugador = event.target;

    // Si escribimos algo
    if (jugador.value) {
        // Si es el último jugador
        if (jugador.dataset.index == cantidad_jugadores) {
            // Agregamos otro campo vacío para ingresar otro jugador si es necesario
            const nuevo_jugador = jugador.cloneNode();
            nuevo_jugador.value = '';
            cantidad_jugadores++;
            nuevo_jugador.dataset.index = cantidad_jugadores;
            nuevo_jugador.classList.add('fade-in');
            nuevo_jugador.setAttribute('placeholder', 'Jugador ' + (cantidad_jugadores + 1));
            nuevo_jugador.addEventListener('input', modificaJugador);
            nuevo_jugador.addEventListener('keydown', avanzarSiguienteJugador);
            jugador.parentElement.append(nuevo_jugador);

            // Si hay más de dos jugadores
            if (cantidad_jugadores >= 2) {
                // Habilitamos el botón para crear
                crear_torneo.removeAttribute('disabled');
            }
        }

    // Si borramos el nombre
    } else {
        let jugador_actual = jugador.nextElementSibling;

        // Ajustamos los índices
        for (let i = jugador.dataset.index; i < cantidad_jugadores; i++) {
            jugador_actual.dataset.index = i;
            jugador_actual.setAttribute('placeholder', 'Jugador ' + (+i + 1));
            jugador_actual = jugador_actual.nextElementSibling;
        }

        // Damos foco al campo que le sigue (siempre va a haber uno, o bien el campo vacío)
        jugador.nextElementSibling.focus();

        // Borramos el campo
        jugador.remove();
        cantidad_jugadores--;

        // Si hay menos de dos jugadores
        if (cantidad_jugadores < 2) {
            // Deshabilitamos el botón para crear
            crear_torneo.setAttribute('disabled', true);
        }
    }
}

function avanzarSiguienteJugador(event) {
    if (event.key === 'Enter') {
        const jugador = event.target;

        // Sólo avanza si tiene un elemento que le siga
        if (jugador.nextElementSibling) {
            jugador.nextElementSibling.focus();
        }
    }
}

function crearTorneo(event) {
    // Deshabilitamos el botón
    event.target.setAttribute('disabled', true);
    // Agregamos el contenedor del torneo
    const torneo = document.createElement('div');
    torneo.classList.add('torneo');
    document.querySelector('#main-section').prepend(torneo);
    // Título
    const titulo = document.createElement('p');
    titulo.textContent = 'Torneo actual';
    titulo.classList.add('section-title');
    torneo.append(titulo);
    // Cerrar torneo actual
    const cerrar = document.createElement('a');
    cerrar.textContent = '[Cerrar]'
    cerrar.href = '#';
    cerrar.onclick = cerrarTorneo;
    cerrar.style.float = 'right';
    titulo.append(cerrar);
    // Info
    const info = document.createElement('p');
    if (esDispositivoMovil) {
        info.textContent = 'Presiona sobre un jugador para marcarlo como ganador y avanzar a la siguiente ronda. Mantén presionado para revertir un enfrentamiento.';
    } else {
        info.textContent = 'Haz clic sobre un jugador para marcarlo como ganador y avanzar a la siguiente ronda. Clic derecho para revertir un enfrentamiento.';
    }
    info.classList.add('comment');
    torneo.append(info);

    // Cargamos los jugadores
    const jugadores_sin_ordenar = [];
    document.querySelectorAll('.jugador').forEach(jugador => {
        // No cargamos el vacío
        if (jugador.value) {
            jugadores_sin_ordenar.push(jugador.value);
        }
        // Bloqueamos todos los campos
        jugador.setAttribute('disabled', true);
    });

    // Seteamos la seed (si se usa)
    setRandomSeed(document.querySelector('#semilla').value);

    // Ordenamos al azar
    const jugadores = [];
    for (let i = 0; i < cantidad_jugadores; i++) {
        const indice = Math.floor(randomValue() * jugadores_sin_ordenar.length);
        jugadores.push(jugadores_sin_ordenar[indice]);
        jugadores_sin_ordenar.splice(indice, 1);
    }

    // Calculamos la cantidad de rondas
    const cantidad_rondas = Math.ceil(Math.log2(cantidad_jugadores));
    const cantidad_por_ronda = Array(cantidad_rondas + 1).fill(0);
    
    // Calculamos la cantidad de jugadores que participan en la primer ronda, el resto pasa sin jugar
    const cantidad_primer_ronda = 2 * cantidad_jugadores - Math.pow(2, cantidad_rondas);
    let contador_segunda_ronda = cantidad_primer_ronda;

    // Armamos el gráfico del torneo
    const torneo_grafico = construirRama(cantidad_rondas);
    torneo_grafico.classList.add('torneo-grafico');

    // Lo creamos recursivamente
    function construirRama(ronda) {
        const indice = cantidad_por_ronda[ronda];
        // Creamos el contenedor de la rama
        const contenedor = document.createElement('div');
        contenedor.classList.add('torneo-h');
        // Jugador inicial o el ganador de esta rama
        const jugador = document.createElement('div');
        jugador.classList.add('torneo-jugador');
        jugador.dataset.index = indice;
        jugador.dataset.ronda = ronda;
        const nombre = document.createElement('p');
        jugador.append(nombre);
        // Aumentamos el índice de la ronda
        cantidad_por_ronda[ronda]++;
        // Condición de salida
        if (ronda > 0) {
            // Creo la capa para contener a las sub ramas
            const bifurcacion = document.createElement('div');
            bifurcacion.classList.add('torneo-v');
            // Primer jugador:
            const primer_jugador = construirRama(ronda - 1);
            // Si existe el primer jugador de esta rama
            if (primer_jugador) {
                // Lo agregamos
                bifurcacion.append(primer_jugador);
                // Segundo jugador:
                const segundo_jugador = construirRama(ronda - 1);
                // Si existe el primero también existe el segundo
                bifurcacion.append(segundo_jugador);
                // Al ganador de esta rama le ponemos un nombre de relleno, es sólo para ajustar la vista
                nombre.textContent = '-';
                // Seteamos el nombre como invisible
                jugador.classList.add('ocultar-nombre');
                // Agregamos ambas ramas al contenedor
                contenedor.append(bifurcacion);
                // Sólo lo conectamos con el anterior si no es la primer ronda
                jugador.classList.add('ganador-ronda');
            // Si no existe ningún jugador en esta rama, entonces es uno que pasó sin jugar
            } else {
                // Lo ponemos como activo
                jugador.classList.add('activo');
                // Le damos el nombre
                nombre.textContent = jugadores[contador_segunda_ronda];
                // Aumentamos el índice del jugador
                contador_segunda_ronda++;
            }
        // Si es la primer ronda
        } else {
            // Sólo creamos los slots que juegan la primer ronda
            if (indice >= cantidad_primer_ronda) return false;
            // Ponemos los jugadores como activos
            jugador.classList.add('activo');
            // Le ponemos el nombre
            nombre.textContent = jugadores[indice];
        }
        // Agregamos el jugador al contenedor
        contenedor.append(jugador);
        return contenedor;
    }

    // Lo mostramos
    torneo.append(torneo_grafico);
    // Lo ponemos en pantalla
    torneo.scrollIntoView({
        behavior: 'smooth'
    });
    // Scroll a la izquierda, si hay overflow-x
    torneo.scrollLeft = 0;

    // Agregamos evento de clic a los usuarios, para avanzarlos de ronda
    document.querySelectorAll('.torneo-jugador.activo').forEach(jugador => {
        jugador.onclick = pasarDeRonda;
    });

    function pasarDeRonda(event) {
        const jugador = event.currentTarget;
        const { ronda, index: indice } = jugador.dataset;

        // Comprobamos que tenga un oponente
        const indice_oponente = indice ^ 1; // Bit hack
        const oponente = document.querySelector(`.torneo-jugador.activo[data-ronda="${ronda}"][data-index="${indice_oponente}"]`)

        if (oponente) {
            // Desactivamos al ganador
            jugador.classList.remove('activo');
            jugador.onclick = null;
            jugador.oncontextmenu = null;
            // Desactivamos al oponente
            oponente.classList.remove('activo');
            oponente.onclick = null;
            oponente.oncontextmenu = null;
            // Obtenemos el slot del ganador
            const ganador = document.querySelector(`.torneo-jugador[data-ronda="${+ronda + 1}"][data-index="${Math.floor(+indice / 2)}"]`);
            // Le colocamos el nombre del ganador
            ganador.firstChild.textContent = jugador.firstChild.textContent;
            // Mostramos el nombre
            ganador.classList.remove('ocultar-nombre');
            // Lo ponemos como activo
            ganador.classList.add('activo');

            // Si es el ganador del torneo
            if (+ronda + 1 === cantidad_rondas) {
                // Colocamos la corona encima del nombre
                ganador.prepend(corona);
                ganador.oncontextmenu = revertirRonda;

            // Si no ganó el torneo aún
            } else {
                // Le agregamos el evento de clic
                ganador.onclick = pasarDeRonda;
                ganador.oncontextmenu = revertirRonda;
            }
        }
    }

    function revertirRonda(event) {
        const ganador = event.currentTarget;
        const { ronda, index: indice } = ganador.dataset;

        // Obtenemos los slot de los que combaten
        const jugadores = [
            document.querySelector(`.torneo-jugador[data-ronda="${+ronda - 1}"][data-index="${+indice * 2}"]`),
            document.querySelector(`.torneo-jugador[data-ronda="${+ronda - 1}"][data-index="${+indice * 2 + 1}"]`)
        ];

        jugadores.forEach(jugador => {
            // Activamos ambos
            jugador.classList.add('activo');
            // Seteamos el evento click
            jugador.onclick = pasarDeRonda;
            // Si el slot es resultado de un combate, seteamos el evento para revertir
            if (jugador.classList.contains('ganador-ronda')) {
                jugador.oncontextmenu = revertirRonda;
            }
        });

        // Desactivamos el slot ganador
        ganador.classList.remove('activo');
        // Si era el ganador del torneo
        if (+ronda === cantidad_rondas) {
            // Le quitamos la corona
            ganador.firstChild.remove();
        }
        // Ocultamos el nombre
        ganador.classList.add('ocultar-nombre');
        // Sacamos los eventos
        ganador.onclick = null;
        ganador.oncontextmenu = null;

        // Prevenimos que se muestre el menú contextual
        event.preventDefault();
        return false;
    }
}

function cerrarTorneo() {
    // Borramos la capa del torneo
    document.querySelector('.torneo').remove();
    // Habilitamos el botón
    crear_torneo.removeAttribute('disabled');
    // Habilitamos los campos de los jugadores
    document.querySelectorAll('.jugador').forEach(jugador => {
        jugador.removeAttribute('disabled');
    });
}

function sortearCartas(event) {
    // Deshabilitamos el botón
    event.target.setAttribute('disabled', true);
    // Reseteamos la barra de carga
    resetearBarraDeCarga();
    // Llenamos la barra en 4 segundos
    cargarBarraTotal();

    // Borramos el contenedor anterior, si existe
    let contenedor = document.querySelector('.cartas');
    if (contenedor) contenedor.remove();

    // Creamos el contenedor de las cartas
    contenedor = document.createElement('div');
    document.querySelector('.section-cartas').append(contenedor);
    contenedor.classList.add('cartas', 'fade-in');

    let cantidad_cartas = document.querySelector('.cantidad_cartas').value;
    
    // Si la cantidad está mal, la ponemos en 1
    if (Number.isNaN(cantidad_cartas) || cantidad_cartas < 1 || cantidad_cartas > 8) {
        document.querySelector('.cantidad_cartas').value = 1;
        cantidad_cartas = 1;
    }
    
    // Agregamos todas las cartas
    const mazo = [];

    for (let i = 0; i < cantidad_cartas; i++) {
        const div = document.createElement('div');
        div.classList.add('carta');
        const carta = carta_desconocida.cloneNode();
        div.append(carta);
        contenedor.append(div);
        mazo.push(div);
    }

    // Seteamos el foco en las cartas
    contenedor.scrollIntoView({
        behavior: 'smooth'
    });

    // Seteamos la seed a 0 para ver cartas aleatorias en la animación
    setRandomSeed(0);

    // Esperamos 1 segundo
    setTimeout(barajarCartas, 1000);

    let termino_de_barajar = false;

    // Empezamos a barajar
    function barajarCartas() {
        // Cambiamos a una carta aleatoria cada X frames
        requestAnimationFrame(cambiarCartas);
        // Barajamos durante un poco menos de 3 segundos
        setTimeout(() => {
            termino_de_barajar = true;
            // Seteamos la seed elegida (si se usa)
            setRandomSeed(document.querySelector('#semilla').value);
        }, 2850);
    }

    const elegidas = new Set();
    let frame = 0;

    function cambiarCartas() {
        frame++;
        // Cambiamos de carta cada X frames
        if (frame >= 10) {
            // Por cada carta
            for (const carta of mazo) {
                // Elegimos una carta al azar
                let indice;
                do {
                    indice = Math.floor(randomValue() * cartas.length);
                // Si ya está elegida, elegimos otra
                } while(elegidas.has(indice));
                // Liberamos la carta que usaba antes
                elegidas.delete(+carta.firstChild.dataset.index);
                // Seteamos la imagen
                const carta_data = cartas[indice];
                carta.firstChild.replaceWith(carta_data.image);
                // Marcamos como ya elegida
                elegidas.add(indice);
            }
            frame = 0;
            // La última barajada
            if (termino_de_barajar) {
                return mostrarCartasFinales();
            }
        }
        requestAnimationFrame(cambiarCartas);
    }

    function mostrarCartasFinales() {
        // Agregamos el nombre debajo de cada carta
        for (const carta of mazo) {
            const indice = carta.firstChild.dataset.index;
            const nombre = Translate(cartas[indice].name) || cartas[indice].name;
            const p = document.createElement('p');
            p.classList.add('nombre-carta');
            p.textContent = nombre;
            carta.append(p);
        }
        // Seteamos el foco en las cartas otra vez, por si se desplazó con los nombres
        contenedor.scrollIntoView({
            behavior: 'smooth'
        });
        // Volvemos a habilitar el botón
        event.target.removeAttribute('disabled');
        // Esperamos un momento y removemos la barra de carga
        timer_ocultar_barra = setTimeout(ocultarBarraDeCarga, 500);
    }
}

// Pedimos a la API de Clash Royale info sobre las cartas
fetch('https://proxy.royaleapi.dev/v1/cards', {
    method: 'get',
    headers: {
        Accept: 'application/json',
        // No importa que el token sea público...
        Authorization: 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiIsImtpZCI6IjI4YTMxOGY3LTAwMDAtYTFlYi03ZmExLTJjNzQzM2M2Y2NhNSJ9.eyJpc3MiOiJzdXBlcmNlbGwiLCJhdWQiOiJzdXBlcmNlbGw6Z2FtZWFwaSIsImp0aSI6Ijc5NWFhMjBiLTViZDItNGRhNC1hYTJhLTk1MDQzYjQyZDRiYyIsImlhdCI6MTYxMjg5NDE5OSwic3ViIjoiZGV2ZWxvcGVyL2ZmZTIzY2I1LTg5Y2QtNTg5NS1kMGUwLWViZDAzN2ZhNWRhYyIsInNjb3BlcyI6WyJyb3lhbGUiXSwibGltaXRzIjpbeyJ0aWVyIjoiZGV2ZWxvcGVyL3NpbHZlciIsInR5cGUiOiJ0aHJvdHRsaW5nIn0seyJjaWRycyI6WyIxMjguMTI4LjEyOC4xMjgiXSwidHlwZSI6ImNsaWVudCJ9XX0.yzbr-p86RQabg3iyHn7Wg5YslrT7Rx4k35Yy9ERH4XBdQEnMEHjKcCU1EwfujdkSdefYwovWP1iJPBXGAk9TPA'
    }
})
.then(async res => {
    const data = await res.json();
    cartas = data.items;
    // Ya tenemos la info de las cartas, sumamos un poco a la barra de carga
    agregarPorcentajeDeCarga(10);
    // Precargamos las imágenes
    await precargarImagenes();
    // Habilitamos el botón para sortear cartas
    sortear_cartas.removeAttribute('disabled');
    // Esperamos un momento y removemos la barra de carga
    timer_ocultar_barra = setTimeout(ocultarBarraDeCarga, 500);
})
.catch(() => {
    // Mostramos el error
    const error = document.createElement('p');
    error.textContent = 'Error al cargar las cartas desde la API de Clash Royale. Intente de nuevo más tarde.';
    error.classList.add('error');
    sortear_cartas.parentElement.append(error);
    // Estilizamos el botón
    sortear_cartas.classList.add('error');
});

function precargarImagenes() {
    return new Promise((resolve) => {
        let cargadas = 0;

        // Calculamos el porcentaje que debería sumar cada carta para llegar al 100%
        const porcentaje_carta = (100 - porcentaje_cargado) / cartas.length;

        cartas.forEach((carta, indice) => {
            // Cargamos la imagen de la carta en memoria
            const img = new Image();
            img.src = carta.iconUrls.medium;
            img.dataset.index = indice;
            img.onload = () => {
                // Guardamos la imagen en el array de cartas
                carta.image = img;
                // Aumentamos la barra de carga
                agregarPorcentajeDeCarga(porcentaje_carta);
                cargadas++;
                // Si ya cargamos todas
                if (cargadas >= cartas.length) {
                    resolve();
                }
            };
        });
    });
}

function agregarPorcentajeDeCarga(porcentaje) {
    porcentaje_cargado += porcentaje;
    loading_bar.style.maxWidth = porcentaje_cargado + '%';
}

function resetearBarraDeCarga() {
    clearTimeout(timer_ocultar_barra);
    loading_bar.parentElement.classList.remove('fade-out');
    loading_bar.classList.remove('load-bar');
    porcentaje_cargado = 0;
    // Forzamos un reflow
    void loading_bar.offsetHeight;
}

function cargarBarraTotal() {
    loading_bar.classList.add('load-bar');
}

function ocultarBarraDeCarga() {
    // Desvanecimiento
    loading_bar.parentElement.classList.add('fade-out');
}

function getDispositivoMovil() {
    let check = false;
    (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
    return check;
}

function setRandomSeed(seed) {
    if (seed) {
        random_seed = seed.hashCode();
    } else {
        random_seed = 0;
    }
}

// Función random personalizada:
// Si la seed es 0, funciona igual que Math.random. Si no, usa la seed para generar los números.
function randomValue() {
    if (random_seed) {
        random_seed = random_seed * 16807 % 2147483647;
        return (random_seed - 1) / 2147483646;
    } else {
        return Math.random();
    }
}

function definirStringHash() {
    Object.defineProperty(String.prototype, 'hashCode', {
        value: function() {
            var hash = 0, i, chr;
            for (i = 0; i < this.length; i++) {
                chr   = this.charCodeAt(i);
                hash  = ((hash << 5) - hash) + chr;
                hash |= 0; // Convert to 32bit integer
            }
            return hash;
        }
    });
}