/**
 * Converte um número para valor por extenso em Português (Portugal/Moçambique).
 * Foca-se em valores monetários (Meticais).
 */
export function valorPorExtenso(valor: number): string {
    if (!valor || valor <= 0) return '';

    const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
    const dezena_especial = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
    const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitocenta', 'noventa'];
    const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

    // Arredonda para 2 casas decimais
    valor = Math.round(valor * 100) / 100;

    const partes = valor.toString().split('.');
    const inteira = parseInt(partes[0]);
    const decimal = partes[1] ? parseInt(partes[1].padEnd(2, '0').substring(0, 2)) : 0;

    function converter_grupo(n: number): string {
        if (n === 100) return 'cem';
        if (n === 0) return '';

        let res = '';
        const h = Math.floor(n / 100);
        const d = Math.floor((n % 100) / 10);
        const u = n % 10;

        if (h > 0) {
            res += centenas[h];
            if (d > 0 || u > 0) res += ' e ';
        }

        if (d === 1) {
            res += dezena_especial[u];
        } else {
            if (d > 1) {
                res += dezenas[d];
                if (u > 0) res += ' e ';
            }
            if (u > 0 || (h === 0 && d === 0 && n === 0)) {
                if (u > 0) res += unidades[u];
            }
        }
        return res;
    }

    let extenso = '';

    if (inteira === 0) {
        extenso = 'zero';
    } else if (inteira === 1) {
        extenso = 'um metical';
    } else {
        // Lógica simplificada para milhares até 999.999
        const milhar = Math.floor(inteira / 1000);
        const resto = inteira % 1000;

        if (milhar > 0) {
            if (milhar === 1) {
                extenso = 'mil';
            } else {
                extenso = converter_grupo(milhar) + ' mil';
            }
            if (resto > 0) {
                if (resto < 100 || resto % 100 === 0) extenso += ' e ';
                else extenso += ' ';
                extenso += converter_grupo(resto);
            }
        } else {
            extenso = converter_grupo(resto);
        }

        extenso += ' meticais';
    }

    if (decimal > 0) {
        extenso += ' e ' + converter_grupo(decimal) + (decimal === 1 ? ' centavo' : ' centavos');
    }

    // Capitalize first letter
    return extenso.charAt(0).toUpperCase() + extenso.slice(1);
}
