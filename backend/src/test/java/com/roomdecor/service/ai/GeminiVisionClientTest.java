package com.roomdecor.service.ai;

import com.roomdecor.exception.BadRequestException;
import org.junit.jupiter.api.Test;

import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class GeminiVisionClientTest {

    private static final String OK_BODY = """
        {"candidates": [{"content": {"parts": [{"text":
          "{\\"corners\\": [{\\"x\\":0,\\"y\\":0},{\\"x\\":3,\\"y\\":0},{\\"x\\":3,\\"y\\":3},{\\"x\\":0,\\"y\\":3}], \\"ceilingHeightMeters\\": 2.7, \\"openings\\": [], \\"description\\": \\"ok\\"}"
        }]}}]}
        """;

    private final HttpClient http = mock(HttpClient.class);
    private final GeminiVisionClient client = new GeminiVisionClient("test-key", "test-model", "low", http, new long[] {0, 0});
    private final List<RoomVisionClient.ImageInput> photos =
        List.of(new RoomVisionClient.ImageInput("http://localhost/files/a.jpg", new byte[] {1, 2, 3}, "image/jpeg"));

    @Test
    void retriesWhenGoogleIsBusyThenSucceeds() throws Exception {
        HttpResponse<String> busy = response(503, "{\"error\": {\"code\": 503}}");
        HttpResponse<String> ok = response(200, OK_BODY);
        doReturn(busy, busy, ok).when(http).send(any(HttpRequest.class), any());

        RoomVisionClient.RoomAnalysisResult result = client.analyze(photos, RoomVisionClient.ScanHints.NONE);

        assertThat(result.walls()).hasSize(4);
        assertThat(result.description()).isEqualTo("ok");
        verify(http, times(3)).send(any(HttpRequest.class), any());
    }

    @Test
    void givesUpAfterRetriesWithShortMessage() throws Exception {
        HttpResponse<String> busy = response(429, "{\"error\": {\"message\": \"quota details\"}}");
        doReturn(busy).when(http).send(any(HttpRequest.class), any());

        assertThatThrownBy(() -> client.analyze(photos, RoomVisionClient.ScanHints.NONE))
            .isInstanceOf(BadRequestException.class)
            .hasMessage(GeminiVisionClient.BUSY_MESSAGE);
        verify(http, times(3)).send(any(HttpRequest.class), any());
    }

    @Test
    void otherErrorsAreNotRetriedAndDoNotLeakGoogleBody() throws Exception {
        HttpResponse<String> notFound = response(404, "{\"error\": {\"message\": \"secret details\"}}");
        doReturn(notFound).when(http).send(any(HttpRequest.class), any());

        assertThatThrownBy(() -> client.analyze(photos, RoomVisionClient.ScanHints.NONE))
            .isInstanceOf(BadRequestException.class)
            .hasMessageContaining("test-model")
            .hasMessageNotContaining("secret details");
        verify(http, times(1)).send(any(HttpRequest.class), any());
    }

    @SuppressWarnings("unchecked")
    private static HttpResponse<String> response(int status, String body) {
        HttpResponse<String> resp = mock(HttpResponse.class);
        when(resp.statusCode()).thenReturn(status);
        when(resp.body()).thenReturn(body);
        return resp;
    }
}
