import { defineStore } from 'pinia';
import { useVsCodeApiStore } from './vscode';

export const useSenderStore = defineStore('sender', () => {
    const vscode = useVsCodeApiStore().vscode;

    function initReady(){
        vscode?.postMessage({command: 'init.ready'});
    }

    function modelIDUpdate(newID: string){
        vscode?.postMessage({
            command: 'modelID.update',
            modelID: newID
        });
    }

    function configUpdate(){
        vscode?.postMessage({command: 'config.update'});
    }

    function modelAdd(model: string){
        vscode?.postMessage({
            command: 'model.add',
            model: model
        });
    }
    
    function modelDelete(modelID: string){
        vscode?.postMessage({
            command: 'model.delete',
            modelID: modelID
        });
    }

    function requestSend(request: string, context: string){
        vscode?.postMessage({
            command: 'request.send',
            request: request,
            context: context
        });
    }
    
    function dialogDelete(requestID: string){
        vscode?.postMessage({
            command: 'dialog.delete',
            requestID: requestID
        });
    }

    function responseStop(){
        vscode?.postMessage({command: 'response.stop'});
    }

    function contextGet(){
        vscode?.postMessage({command: 'context.get'});
    }

    function contextGoto(path: string){
        vscode?.postMessage({
            command: 'context.goto',
            path: path
        });
    }

    function fileUpload(fileName: string, content: string, fileType: string){
        vscode?.postMessage({
            command: 'file.upload',
            fileName: fileName,
            content: content,
            fileType: fileType
        });
    }

    return {
        initReady,
        modelIDUpdate,
        configUpdate,
        modelAdd,
        modelDelete,
        requestSend,
        dialogDelete,
        responseStop,
        contextGet,
        contextGoto,
        fileUpload
    }
});