# Acesso à Aplicação pela Rede Local

## Como permitir acesso de outros computadores

### Passo 1: Parar o servidor atual
Se o servidor estiver rodando, pare-o pressionando `Ctrl+C` no terminal.

### Passo 2: Iniciar o servidor com acesso de rede
Execute o seguinte comando:

```bash
npm run dev:network
```

Ou diretamente:

```bash
ng serve --host 0.0.0.0
```

### Passo 3: Descobrir o endereço IP do computador
No Windows, abra o PowerShell ou CMD e execute:

```bash
ipconfig
```

Procure pelo **Endereço IPv4** na seção da sua conexão de rede (Wi-Fi ou Ethernet).
Exemplo: `192.168.1.100`

### Passo 4: Acessar de outros computadores
Nos outros computadores da mesma rede, abra um navegador e acesse:

```
http://[SEU_IP]:4200
```

Exemplo:
```
http://192.168.1.100:4200
```

## Configuração de Firewall

Se não conseguir acessar, pode ser necessário liberar a porta 4200 no firewall do Windows:

1. Abra **Firewall do Windows com Segurança Avançada**
2. Clique em **Regras de Entrada**
3. Clique em **Nova Regra...**
4. Selecione **Porta** → Avançar
5. Selecione **TCP** e digite `4200` → Avançar
6. Selecione **Permitir a conexão** → Avançar
7. Marque todos os perfis → Avançar
8. Dê um nome (ex: "Angular Dev Server") → Concluir

## Notas Importantes

- ⚠️ Esta configuração é apenas para desenvolvimento
- 🔒 Não use em produção sem configurações de segurança adequadas
- 📱 Todos os dispositivos devem estar na mesma rede local
- 💾 Os dados são armazenados localmente no navegador de cada dispositivo (localStorage)

## Compartilhar Dados Entre Dispositivos

Como a aplicação usa `localStorage`, cada navegador terá seus próprios dados. Para compartilhar dados:

### Opção 1: Backend Compartilhado (Futuro)
Implementar um backend com banco de dados compartilhado.

### Opção 2: Exportar/Importar (Atual)
Usar as funcionalidades de backup/restore para transferir dados entre dispositivos.
