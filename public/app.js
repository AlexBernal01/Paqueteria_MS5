async function searchShipment() {
    const trackingInput = document.getElementById("trackingInput").value.trim();
    const resultContainer = document.getElementById("shipmentResult");

    if (!trackingInput) {
        alert("Ingresa un numero de guia");
        return;
    }

    try {
        const response = await fetch(`/shipments/${trackingInput}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();

        if (data.error) {
            resultContainer.style.display = "block";
            resultContainer.innerHTML = `<p style="color:#c42828; text-align:center;">${data.error}</p>`;
            return;
        }

        const address = data.shipping_addresses?.[0] || {};
        const tracking = data.tracking_events?.[0] || {};
        
        let currentStatus = tracking.status || "PREPARACION";
        
        const steps = ["PREPARACION", "RECOLECCION", "TRANSITO", "ENTREGADO"];
        
        const stepNames = {
            "PREPARACION": "PREPARACION",
            "RECOLECCION": "RECOLECCION",
            "TRANSITO": "TRANSITO",
            "ENTREGADO": "ENTREGADO"
        };
        
        let currentStep = steps.indexOf(currentStatus);
        if (currentStep === -1) {
            currentStep = 0;
        }
        
        const isTerminal = currentStatus === 'CANCELADO' || currentStatus === 'DEVUELTO';
        
        let buttonsHTML = '';
        
        if (!isTerminal) {
            if (currentStatus !== 'ENTREGADO') {
                buttonsHTML += `<button class="cancel" onclick="cancelShipmentAction('${data.tracking_number}', '${currentStatus}')">Cancelar Envio</button>`;
            }
            
            if (currentStatus === 'ENTREGADO') {
                buttonsHTML += `<button class="return" onclick="returnShipmentAction('${data.tracking_number}', '${currentStatus}')">Solicitar Devolucion</button>`;
            }
            
            buttonsHTML += `<button class="support" onclick="contactSupport()">Contactar Soporte</button>`;
        } else {
            buttonsHTML = `<button class="support" onclick="contactSupport()">Contactar Soporte</button>`;
        }

        const estimatedDate = new Date();
        estimatedDate.setDate(estimatedDate.getDate() + 3);
        const formattedDate = estimatedDate.toLocaleDateString("es-MX", {
            year: "numeric",
            month: "long",
            day: "numeric"
        });

        let progressHTML = '<div class="progress-container">';
        for (let i = 0; i < steps.length; i++) {
            let stepClass = "";
            let lineClass = "";
            
            if (isTerminal) {
                stepClass = "pending";
            } else if (i < currentStep) {
                stepClass = "completed";
            } else if (i === currentStep) {
                stepClass = "active";
            } else {
                stepClass = "pending";
            }
            
            if (!isTerminal && i < currentStep) {
                lineClass = "completed";
            } else {
                lineClass = "";
            }
            
            const showLine = i < steps.length - 1;
            
            progressHTML += `
                <div class="step-wrapper">
                    <div class="step ${stepClass}">
                        ${i + 1}
                    </div>
                    <span>${stepNames[steps[i]]}</span>
                    ${showLine ? `<div class="line ${lineClass}"></div>` : ""}
                </div>
            `;
        }
        progressHTML += '</div>';

        let specialMessage = '';
        if (currentStatus === 'CANCELADO') {
            specialMessage = `
                <div style="text-align: center; padding: 25px; background: #fee2e2; border-radius: 16px; margin: 20px 0;">
                    <h2 style="color: #c42828;">ENVIO CANCELADO</h2>
                    <p>Este envio ha sido cancelado</p>
                    <p><strong>Ubicacion:</strong> ${tracking.current_location || "No disponible"}</p>
                    <p><strong>Fecha:</strong> ${tracking.updated_at ? new Date(tracking.updated_at).toLocaleString("es-MX") : "Sin fecha"}</p>
                </div>
            `;
        } else if (currentStatus === 'DEVUELTO') {
            specialMessage = `
                <div style="text-align: center; padding: 25px; background: #fef3c7; border-radius: 16px; margin: 20px 0;">
                    <h2 style="color: #c42828;">DEVOLUCION SOLICITADA</h2>
                    <p>Se ha procesado la devolucion de este pedido</p>
                    <p><strong>Ubicacion:</strong> ${tracking.current_location || "No disponible"}</p>
                    <p><strong>Fecha:</strong> ${tracking.updated_at ? new Date(tracking.updated_at).toLocaleString("es-MX") : "Sin fecha"}</p>
                </div>
            `;
        }

        const newContent = `
            <div class="card">
                <div style="display: flex; justify-content: space-between; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #f0f0f0;">
                    <div>
                        <h2 style="font-size: 22px; color: #c42828; margin-bottom: 8px;">Pedido: ${data.order_id}</h2>
                        <p style="color: #666; font-size: 14px;"><strong>Guia:</strong> ${data.tracking_number}</p>
                    </div>
                    <div style="text-align: right;">
                        <p style="color: #666; font-size: 14px;"><strong>Paqueteria:</strong> ${data.courier}</p>
                        <p style="color: #666; font-size: 14px;"><strong>Entrega estimada:</strong> ${formattedDate}</p>
                    </div>
                </div>

                ${progressHTML}
                ${specialMessage}

                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 25px; margin: 30px 0;">
                    <div style="background: #f9f9f9; padding: 22px; border-radius: 16px;">
                        <h3 style="font-size: 17px; color: #c42828; margin-bottom: 15px;">Informacion del Destinatario</h3>
                        <p style="font-size: 14px; color: #555;"><strong>Nombre:</strong> ${address.recipient_name || "No disponible"}</p>
                        <p style="font-size: 14px; color: #555;"><strong>Direccion:</strong> ${address.address_line || "No disponible"}</p>
                        <p style="font-size: 14px; color: #555;"><strong>Ciudad:</strong> ${address.city || "No disponible"}</p>
                        <p style="font-size: 14px; color: #555;"><strong>Codigo Postal:</strong> ${address.zip_code || "No disponible"}</p>
                    </div>

                    <div style="background: #f9f9f9; padding: 22px; border-radius: 16px;">
                        <h3 style="font-size: 17px; color: #c42828; margin-bottom: 15px;">Estado Actual</h3>
                        <p style="font-size: 14px; color: #555;"><strong>Estado:</strong> <span style="color: #c42828; font-weight: bold;">${currentStatus}</span></p>
                        <p style="font-size: 14px; color: #555;"><strong>Ubicacion:</strong> ${tracking.current_location || "Sin ubicacion"}</p>
                        <p style="font-size: 14px; color: #555;"><strong>Ultima actualizacion:</strong> ${tracking.updated_at ? new Date(tracking.updated_at).toLocaleString("es-MX") : "Sin fecha"}</p>
                    </div>
                </div>

                <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                    ${buttonsHTML}
                </div>
            </div>
        `;

        if (resultContainer.style.display === "none" || resultContainer.innerHTML === "") {
            resultContainer.style.display = "block";
            resultContainer.innerHTML = newContent;
            resultContainer.style.opacity = "0";
            resultContainer.style.transform = "translateY(20px)";
            resultContainer.style.transition = "opacity 0.3s ease, transform 0.3s ease";
            
            setTimeout(() => {
                resultContainer.style.opacity = "1";
                resultContainer.style.transform = "translateY(0)";
            }, 10);
        } else {
            resultContainer.style.transition = "opacity 0.2s ease";
            resultContainer.style.opacity = "0";
            
            setTimeout(() => {
                resultContainer.innerHTML = newContent;
                resultContainer.style.opacity = "1";
            }, 150);
        }

        resultContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch (error) {
        resultContainer.style.display = "block";
        resultContainer.innerHTML = `<p style="color:#c42828; text-align:center;">Error al consultar el envio</p>`;
    }
}

async function cancelShipmentAction(trackingNumber, currentStatus) {
    let mensajeConfirmacion = "";
    
    if (currentStatus === 'PREPARACION') {
        mensajeConfirmacion = "Cancelar envio " + trackingNumber + "? El proceso se detendra completamente.";
    } else if (currentStatus === 'RECOLECCION' || currentStatus === 'TRANSITO') {
        mensajeConfirmacion = "Cancelar envio " + trackingNumber + "? Se iniciara la devolucion al centro de envios.";
    } else {
        mensajeConfirmacion = "Cancelar envio " + trackingNumber + "?";
    }

    const confirmCancel = confirm(mensajeConfirmacion);
    if (!confirmCancel) return;

    try {
        const response = await fetch("/shipments/" + trackingNumber + "/cancel", {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });

        const result = await response.json();

        if (response.ok) {
            alert(result.mensaje);
            searchShipment();
        } else {
            alert("Error: " + result.error);
        }
    } catch (error) {
        alert("Error al conectar con el servidor");
    }
}

async function returnShipmentAction(trackingNumber, currentStatus) {
    if (currentStatus !== 'ENTREGADO') {
        alert("La devolucion solo se puede solicitar cuando el pedido ya fue entregado");
        return;
    }
    
    const confirmReturn = confirm("Solicitar devolucion del producto " + trackingNumber + "? Se coordinara la recoleccion en tu domicilio.");
    
    if (!confirmReturn) return;

    try {
        const response = await fetch("/shipments/" + trackingNumber + "/return", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const result = await response.json();

        if (response.ok) {
            alert(result.mensaje);
            searchShipment();
        } else {
            alert("Error: " + result.error);
        }
    } catch (error) {
        alert("Error al conectar con el servidor");
    }
}

function contactSupport() {
    alert("Soporte: soporte@urbanmarket.com | Tel: 800-URBAN-MK");
}